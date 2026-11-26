package com.observatory.engine;

import com.observatory.exception.ExpressionException;
import com.observatory.model.EvaluationResponse.CalculationStep;
import com.observatory.model.EvaluationResponse.PostfixEvalStep;
import com.observatory.model.ExpressionNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Stack;

@Component
public class ExpressionEvaluator {

    public static class EvaluationResult {
        private final double value;
        private final String formattedValue;
        private final List<String> intermediateCalculations;
        private final List<CalculationStep> calculationSteps;
        private final List<PostfixEvalStep> postfixEvaluationTrace;

        public EvaluationResult(
                double value,
                String formattedValue,
                List<String> intermediateCalculations,
                List<CalculationStep> calculationSteps,
                List<PostfixEvalStep> postfixEvaluationTrace) {
            this.value = value;
            this.formattedValue = formattedValue;
            this.intermediateCalculations = intermediateCalculations;
            this.calculationSteps = calculationSteps;
            this.postfixEvaluationTrace = postfixEvaluationTrace;
        }

        public double getValue() {
            return value;
        }

        public String getFormattedValue() {
            return formattedValue;
        }

        public List<String> getIntermediateCalculations() {
            return intermediateCalculations;
        }

        public List<CalculationStep> getCalculationSteps() {
            return calculationSteps;
        }

        public List<PostfixEvalStep> getPostfixEvaluationTrace() {
            return postfixEvaluationTrace;
        }
    }

    public EvaluationResult evaluate(ExpressionNode root, Map<String, Double> variables) {
        List<String> traceStrings = new ArrayList<>();
        List<CalculationStep> steps = new ArrayList<>();
        List<PostfixEvalStep> postfixTrace = new ArrayList<>();
        Stack<Double> evalStack = new Stack<>();

        List<ExpressionNode> postorderNodes = collectPostorderNodes(root);
        int traceCounter = 1;

        for (ExpressionNode node : postorderNodes) {
            String type = node.getType();

            if ("NUMBER".equals(type)) {
                double val = normalizeZero(Double.parseDouble(node.getValue()));
                String formatted = formatNumber(val);
                node.setEvaluatedValue(formatted);
                evalStack.push(val);
                postfixTrace.add(new PostfixEvalStep(
                        traceCounter++,
                        node.getValue(),
                        "PUSH_OPERAND",
                        "Push literal number " + formatted + " onto evaluation stack",
                        snapshotStack(evalStack),
                        node.getId(),
                        null
                ));
            } else if ("VARIABLE".equals(type)) {
                String varName = node.getValue();
                if (variables == null || !variables.containsKey(varName)) {
                    throw new ExpressionException("Undefined variable '" + varName + "'.", "EVALUATION");
                }
                double val = normalizeZero(variables.get(varName));
                String formatted = formatNumber(val);
                node.setEvaluatedValue(formatted);
                evalStack.push(val);
                postfixTrace.add(new PostfixEvalStep(
                        traceCounter++,
                        varName,
                        "PUSH_OPERAND",
                        "Resolve variable " + varName + " = " + formatted + " and push onto evaluation stack",
                        snapshotStack(evalStack),
                        node.getId(),
                        null
                ));
            } else if ("UNARY_OPERATOR".equals(type)) {
                if (evalStack.isEmpty()) {
                    throw new ExpressionException("Insufficient operands on stack for unary negation.", "EVALUATION");
                }
                double operandVal = evalStack.pop();
                double result = normalizeZero(-operandVal);
                String operandStr = formatNumber(operandVal);
                String formattedRes = formatNumber(result);

                node.setEvaluatedValue(formattedRes);
                evalStack.push(result);
                List<String> stackAfter = snapshotStack(evalStack);

                String exprText = "NEG(" + operandStr + ")";
                traceStrings.add(exprText + " = " + formattedRes);
                int order = steps.size() + 1;

                steps.add(new CalculationStep(
                        order,
                        "NEG",
                        operandStr,
                        null,
                        exprText,
                        formattedRes,
                        node.getId(),
                        stackAfter
                ));
                postfixTrace.add(new PostfixEvalStep(
                        traceCounter++,
                        "NEG",
                        "APPLY_UNARY",
                        "Pop " + operandStr + ", apply unary minus -> " + formattedRes + ", push result",
                        stackAfter,
                        node.getId(),
                        order
                ));
            } else if ("OPERATOR".equals(type)) {
                if (evalStack.size() < 2) {
                    throw new ExpressionException(
                            "Insufficient operands on stack for operator '" + node.getValue() + "'.",
                            "EVALUATION"
                    );
                }
                double rightVal = evalStack.pop();
                double leftVal = evalStack.pop();
                String op = node.getValue();
                double result;

                switch (op) {
                    case "+":
                        result = leftVal + rightVal;
                        break;
                    case "-":
                        result = leftVal - rightVal;
                        break;
                    case "*":
                        result = leftVal * rightVal;
                        break;
                    case "/":
                        if (rightVal == 0.0) {
                            throw new ExpressionException(
                                    "Division by zero is not allowed (attempted " + formatNumber(leftVal) + " / 0).",
                                    "EVALUATION"
                            );
                        }
                        result = leftVal / rightVal;
                        break;
                    default:
                        throw new ExpressionException("Unsupported operator '" + op + "'.", "EVALUATION");
                }

                result = normalizeZero(result);
                String leftStr = formatNumber(leftVal);
                String rightStr = formatNumber(rightVal);
                String formattedRes = formatNumber(result);

                node.setEvaluatedValue(formattedRes);
                evalStack.push(result);
                List<String> stackAfter = snapshotStack(evalStack);

                String exprText = leftStr + " " + op + " " + rightStr;
                traceStrings.add(exprText + " = " + formattedRes);
                int order = steps.size() + 1;

                steps.add(new CalculationStep(
                        order,
                        op,
                        leftStr,
                        rightStr,
                        exprText,
                        formattedRes,
                        node.getId(),
                        stackAfter
                ));
                postfixTrace.add(new PostfixEvalStep(
                        traceCounter++,
                        op,
                        "APPLY_BINARY",
                        "Pop " + leftStr + " and " + rightStr + ", compute " + exprText + " = " + formattedRes + ", push result",
                        stackAfter,
                        node.getId(),
                        order
                ));
            } else {
                throw new ExpressionException("Unknown node type '" + type + "'.", "EVALUATION");
            }
        }

        if (evalStack.size() != 1) {
            throw new ExpressionException("Evaluation stack did not converge to a single result.", "EVALUATION");
        }

        double finalValue = normalizeZero(evalStack.pop());
        return new EvaluationResult(finalValue, formatNumber(finalValue), traceStrings, steps, postfixTrace);
    }

    private List<ExpressionNode> collectPostorderNodes(ExpressionNode root) {
        List<ExpressionNode> nodes = new ArrayList<>();
        collectPostorderRecursive(root, nodes);
        return nodes;
    }

    private void collectPostorderRecursive(ExpressionNode node, List<ExpressionNode> nodes) {
        if (node == null) {
            throw new ExpressionException("Encountered null node during evaluation.", "EVALUATION");
        }
        if (node.getLeft() != null) {
            collectPostorderRecursive(node.getLeft(), nodes);
        }
        if (node.getRight() != null) {
            collectPostorderRecursive(node.getRight(), nodes);
        }
        nodes.add(node);
    }

    private List<String> snapshotStack(Stack<Double> stack) {
        List<String> out = new ArrayList<>(stack.size());
        for (Double d : stack) {
            out.add(formatNumber(d));
        }
        return out;
    }

    private double normalizeZero(double value) {
        return value == 0.0 ? 0.0 : value;
    }

    public static String formatNumber(double value) {
        if (value == 0.0) {
            return "0";
        }
        if (value == Math.rint(value) && Math.abs(value) < 1e15) {
            return Long.toString((long) value);
        }
        String str = Double.toString(value);
        if (str.endsWith(".0")) {
            return str.substring(0, str.length() - 2);
        }
        return str;
    }
}

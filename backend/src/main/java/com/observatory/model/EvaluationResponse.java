package com.observatory.model;

import java.util.List;
import java.util.Map;

public class EvaluationResponse {
    private boolean success;
    private String status;
    private String originalExpression;
    private String resolvedExpression;
    private String postfixExpression;
    private List<String> postfixTokens;
    private List<Token> tokens;
    private List<TraceStep> parsingTrace;
    private ExpressionNode expressionTree;
    private String textTree;
    private List<String> intermediateCalculations;
    private List<CalculationStep> calculationSteps;
    private List<PostfixEvalStep> postfixEvaluationTrace;
    private Double result;
    private String formattedResult;
    private String errorMessage;
    private String errorStage;
    private Integer errorPosition;
    private Map<String, Double> variablesUsed;
    private List<String> preorderTraversal;
    private List<String> inorderTraversal;
    private List<String> postorderTraversal;
    private long executionTimeMicros;

    public static class CalculationStep {
        private int order;
        private String operator;
        private String firstOperand;
        private String secondOperand;
        private String expression;
        private String result;
        private String nodeId;
        private List<String> stackAfter;

        public CalculationStep(
                int order,
                String operator,
                String firstOperand,
                String secondOperand,
                String expression,
                String result,
                String nodeId,
                List<String> stackAfter) {
            this.order = order;
            this.operator = operator;
            this.firstOperand = firstOperand;
            this.secondOperand = secondOperand;
            this.expression = expression;
            this.result = result;
            this.nodeId = nodeId;
            this.stackAfter = stackAfter;
        }

        public int getOrder() {
            return order;
        }

        public String getOperator() {
            return operator;
        }

        public String getFirstOperand() {
            return firstOperand;
        }

        public String getSecondOperand() {
            return secondOperand;
        }

        public String getExpression() {
            return expression;
        }

        public String getResult() {
            return result;
        }

        public String getNodeId() {
            return nodeId;
        }

        public List<String> getStackAfter() {
            return stackAfter;
        }
    }

    public static class PostfixEvalStep {
        private int step;
        private String token;
        private String actionType; // PUSH_OPERAND, APPLY_UNARY, APPLY_BINARY
        private String description;
        private List<String> stackSnapshot;
        private String nodeId;
        private Integer calculationOrder;

        public PostfixEvalStep(
                int step,
                String token,
                String actionType,
                String description,
                List<String> stackSnapshot,
                String nodeId,
                Integer calculationOrder) {
            this.step = step;
            this.token = token;
            this.actionType = actionType;
            this.description = description;
            this.stackSnapshot = stackSnapshot;
            this.nodeId = nodeId;
            this.calculationOrder = calculationOrder;
        }

        public int getStep() {
            return step;
        }

        public String getToken() {
            return token;
        }

        public String getActionType() {
            return actionType;
        }

        public String getDescription() {
            return description;
        }

        public List<String> getStackSnapshot() {
            return stackSnapshot;
        }

        public String getNodeId() {
            return nodeId;
        }

        public Integer getCalculationOrder() {
            return calculationOrder;
        }
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOriginalExpression() {
        return originalExpression;
    }

    public void setOriginalExpression(String originalExpression) {
        this.originalExpression = originalExpression;
    }

    public String getResolvedExpression() {
        return resolvedExpression;
    }

    public void setResolvedExpression(String resolvedExpression) {
        this.resolvedExpression = resolvedExpression;
    }

    public String getPostfixExpression() {
        return postfixExpression;
    }

    public void setPostfixExpression(String postfixExpression) {
        this.postfixExpression = postfixExpression;
    }

    public List<String> getPostfixTokens() {
        return postfixTokens;
    }

    public void setPostfixTokens(List<String> postfixTokens) {
        this.postfixTokens = postfixTokens;
    }

    public List<Token> getTokens() {
        return tokens;
    }

    public void setTokens(List<Token> tokens) {
        this.tokens = tokens;
    }

    public List<TraceStep> getParsingTrace() {
        return parsingTrace;
    }

    public void setParsingTrace(List<TraceStep> parsingTrace) {
        this.parsingTrace = parsingTrace;
    }

    public ExpressionNode getExpressionTree() {
        return expressionTree;
    }

    public void setExpressionTree(ExpressionNode expressionTree) {
        this.expressionTree = expressionTree;
    }

    public String getTextTree() {
        return textTree;
    }

    public void setTextTree(String textTree) {
        this.textTree = textTree;
    }

    public List<String> getIntermediateCalculations() {
        return intermediateCalculations;
    }

    public void setIntermediateCalculations(List<String> intermediateCalculations) {
        this.intermediateCalculations = intermediateCalculations;
    }

    public List<CalculationStep> getCalculationSteps() {
        return calculationSteps;
    }

    public void setCalculationSteps(List<CalculationStep> calculationSteps) {
        this.calculationSteps = calculationSteps;
    }

    public List<PostfixEvalStep> getPostfixEvaluationTrace() {
        return postfixEvaluationTrace;
    }

    public void setPostfixEvaluationTrace(List<PostfixEvalStep> postfixEvaluationTrace) {
        this.postfixEvaluationTrace = postfixEvaluationTrace;
    }

    public Double getResult() {
        return result;
    }

    public void setResult(Double result) {
        this.result = result;
    }

    public String getFormattedResult() {
        return formattedResult;
    }

    public void setFormattedResult(String formattedResult) {
        this.formattedResult = formattedResult;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getErrorStage() {
        return errorStage;
    }

    public void setErrorStage(String errorStage) {
        this.errorStage = errorStage;
    }

    public Integer getErrorPosition() {
        return errorPosition;
    }

    public void setErrorPosition(Integer errorPosition) {
        this.errorPosition = errorPosition;
    }

    public Map<String, Double> getVariablesUsed() {
        return variablesUsed;
    }

    public void setVariablesUsed(Map<String, Double> variablesUsed) {
        this.variablesUsed = variablesUsed;
    }

    public List<String> getPreorderTraversal() {
        return preorderTraversal;
    }

    public void setPreorderTraversal(List<String> preorderTraversal) {
        this.preorderTraversal = preorderTraversal;
    }

    public List<String> getInorderTraversal() {
        return inorderTraversal;
    }

    public void setInorderTraversal(List<String> inorderTraversal) {
        this.inorderTraversal = inorderTraversal;
    }

    public List<String> getPostorderTraversal() {
        return postorderTraversal;
    }

    public void setPostorderTraversal(List<String> postorderTraversal) {
        this.postorderTraversal = postorderTraversal;
    }

    public long getExecutionTimeMicros() {
        return executionTimeMicros;
    }

    public void setExecutionTimeMicros(long executionTimeMicros) {
        this.executionTimeMicros = executionTimeMicros;
    }
}

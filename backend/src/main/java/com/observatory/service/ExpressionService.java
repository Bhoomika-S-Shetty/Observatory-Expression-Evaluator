package com.observatory.service;

import com.observatory.engine.ExpressionEvaluator;
import com.observatory.engine.ExpressionParser;
import com.observatory.engine.ExpressionTreeBuilder;
import com.observatory.engine.ExpressionValidator;
import com.observatory.engine.Tokenizer;
import com.observatory.exception.ExpressionException;
import com.observatory.model.EvaluationResponse;
import com.observatory.model.ExpressionNode;
import com.observatory.model.Token;
import com.observatory.model.ValidationResult;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExpressionService {

    private final Tokenizer tokenizer;
    private final ExpressionValidator validator;
    private final ExpressionParser parser;
    private final ExpressionTreeBuilder treeBuilder;
    private final ExpressionEvaluator evaluator;

    // HashMap storing user-defined variables as specified
    private final HashMap<String, Double> variableStore = new HashMap<>();

    public ExpressionService(
            Tokenizer tokenizer,
            ExpressionValidator validator,
            ExpressionParser parser,
            ExpressionTreeBuilder treeBuilder,
            ExpressionEvaluator evaluator) {
        this.tokenizer = tokenizer;
        this.validator = validator;
        this.parser = parser;
        this.treeBuilder = treeBuilder;
        this.evaluator = evaluator;

        // Seed sensible default observatory variables matching prompt examples
        variableStore.put("a", 10.0);
        variableStore.put("b", 5.0);
        variableStore.put("c", -3.5);
    }

    public synchronized Map<String, Double> getAllVariables() {
        return new LinkedHashMap<>(variableStore);
    }

    public synchronized Map<String, Double> addOrUpdateVariable(String name, Double value, boolean allowOverwrite) {
        String trimmedName = name != null ? name.trim() : "";
        validator.validateVariableAssignment(trimmedName, value, variableStore, allowOverwrite);
        variableStore.put(trimmedName, value);
        return getAllVariables();
    }

    public synchronized Map<String, Double> deleteVariable(String name) {
        if (name == null || !variableStore.containsKey(name)) {
            throw new ExpressionException("Variable '" + name + "' does not exist.", "VARIABLE_MANAGEMENT");
        }
        variableStore.remove(name);
        return getAllVariables();
    }

    private Map<String, Double> buildEffectiveVariables(Map<String, Double> overrideVariables) {
        Map<String, Double> effectiveVariables = new HashMap<>();
        synchronized (this) {
            effectiveVariables.putAll(variableStore);
        }
        if (overrideVariables != null) {
            for (Map.Entry<String, Double> entry : overrideVariables.entrySet()) {
                validator.validateVariableAssignment(entry.getKey(), entry.getValue(), effectiveVariables, true);
                effectiveVariables.put(entry.getKey(), entry.getValue());
            }
        }
        return effectiveVariables;
    }

    public EvaluationResponse evaluateExpression(String expression, Map<String, Double> overrideVariables) {
        Map<String, Double> effectiveVariables = buildEffectiveVariables(overrideVariables);
        return runPipeline(expression, effectiveVariables);
    }

    public EvaluationResponse evaluateIsolated(String expression, Map<String, Double> isolatedVariables) {
        Map<String, Double> scope = isolatedVariables != null ? isolatedVariables : new HashMap<>();
        return runPipeline(expression, scope);
    }

    public ValidationResult validateExpression(String expression, Map<String, Double> overrideVariables) {
        ValidationResult result = new ValidationResult();
        try {
            Map<String, Double> effectiveVariables = buildEffectiveVariables(overrideVariables);
            List<Token> rawTokens = tokenizer.tokenize(expression);
            List<Token> classifiedTokens = validator.validateAndClassify(rawTokens, effectiveVariables);
            ExpressionParser.ParseResult parseResult = parser.toPostfix(classifiedTokens);

            Map<String, Double> usedVars = collectUsedVariables(classifiedTokens, effectiveVariables);

            result.setValid(true);
            result.setStatus("VALID");
            result.setMessage("Syntax and variable references verified (" + classifiedTokens.size() + " tokens).");
            result.setStage("VALIDATION_COMPLETE");
            result.setTokenCount(classifiedTokens.size());
            result.setTokens(classifiedTokens);
            result.setPostfixExpression(parseResult.getPostfixExpression());
            result.setResolvedExpression(buildResolvedExpression(classifiedTokens, effectiveVariables));
            result.setVariablesUsed(usedVars);
        } catch (ExpressionException ex) {
            result.setValid(false);
            result.setStatus("INVALID");
            result.setMessage(ex.getMessage());
            result.setStage(ex.getStage());
            result.setPosition(ex.getPosition());
        }
        return result;
    }

    public Map<String, Object> compareExpressions(
            String expression1,
            String expression2,
            Map<String, Double> overrideVariables) {
        Map<String, Double> effectiveVariables = buildEffectiveVariables(overrideVariables);
        Map<String, Object> payload = new LinkedHashMap<>();

        EvaluationResponse first = evaluateSafe(expression1, effectiveVariables);
        EvaluationResponse second = evaluateSafe(expression2, effectiveVariables);

        payload.put("first", first);
        payload.put("second", second);

        boolean bothSucceeded = first.isSuccess() && second.isSuccess();
        payload.put("comparable", bothSucceeded);

        if (bothSucceeded && first.getResult() != null && second.getResult() != null) {
            double diff = first.getResult() - second.getResult();
            boolean sameResult = Math.abs(diff) < 1e-9;
            payload.put("resultsEqual", sameResult);
            payload.put("difference", diff);
            payload.put("formattedDifference", ExpressionEvaluator.formatNumber(Math.abs(diff)));
            payload.put("explanation", buildComparisonExplanation(first, second, sameResult));
        } else {
            payload.put("resultsEqual", false);
            payload.put("explanation", "One or both expressions failed validation or evaluation. Inspect the error diagnostics above.");
        }

        return payload;
    }

    private EvaluationResponse evaluateSafe(String expression, Map<String, Double> scope) {
        try {
            return runPipeline(expression, scope);
        } catch (ExpressionException ex) {
            EvaluationResponse err = new EvaluationResponse();
            err.setSuccess(false);
            err.setStatus("ERROR");
            err.setOriginalExpression(expression);
            err.setErrorMessage(ex.getMessage());
            err.setErrorStage(ex.getStage());
            err.setErrorPosition(ex.getPosition());
            return err;
        }
    }

    private String buildComparisonExplanation(EvaluationResponse first, EvaluationResponse second, boolean sameResult) {
        String p1 = first.getPostfixExpression();
        String p2 = second.getPostfixExpression();

        if (sameResult) {
            if (p1 != null && p1.equals(p2)) {
                return "Both expressions compile to the identical postfix sequence (" + p1 + ") and evaluate to " + first.getFormattedResult() + ".";
            }
            return "Both expressions produce the same value (" + first.getFormattedResult() + "), even though their postfix forms differ ('" + p1 + "' vs '" + p2 + "').";
        }

        StringBuilder reason = new StringBuilder();
        reason.append("Expression 1 evaluates to ").append(first.getFormattedResult())
              .append(" whereas Expression 2 evaluates to ").append(second.getFormattedResult()).append(". ");

        boolean hasParens1 = first.getOriginalExpression() != null && first.getOriginalExpression().contains("(");
        boolean hasParens2 = second.getOriginalExpression() != null && second.getOriginalExpression().contains("(");
        if (hasParens1 != hasParens2) {
            reason.append("Explicit parentheses override default operator precedence (unary minus > * / > + -), changing the evaluation tree structure. ");
        } else {
            reason.append("Their operator grouping and precedence produce different syntax trees. ");
        }

        reason.append("Compare postfix orders: [").append(p1).append("] vs [").append(p2).append("].");
        return reason.toString();
    }

    private EvaluationResponse runPipeline(String expression, Map<String, Double> scope) {
        long startNano = System.nanoTime();

        // Stage 1: Tokenize
        List<Token> rawTokens = tokenizer.tokenize(expression);

        // Stage 2: Validate & classify unary operators
        List<Token> classifiedTokens = validator.validateAndClassify(rawTokens, scope);

        // Collect variables actually referenced
        Map<String, Double> usedVars = collectUsedVariables(classifiedTokens, scope);

        // Stage 3: Shunting Yard Infix -> Postfix
        ExpressionParser.ParseResult parseResult = parser.toPostfix(classifiedTokens);

        // Stage 4: Build Expression Tree
        ExpressionNode root = treeBuilder.buildTree(parseResult.getPostfixTokens());

        // Stage 5: Evaluate Postfix via Manual Stack + Populated Node Values
        ExpressionEvaluator.EvaluationResult evalResult = evaluator.evaluate(root, scope);

        long elapsedMicros = Math.max(1L, (System.nanoTime() - startNano) / 1000L);

        EvaluationResponse response = new EvaluationResponse();
        response.setSuccess(true);
        response.setStatus("SUCCESS");
        response.setOriginalExpression(expression);
        response.setResolvedExpression(buildResolvedExpression(classifiedTokens, scope));
        response.setTokens(classifiedTokens);
        response.setPostfixExpression(parseResult.getPostfixExpression());

        List<String> postfixLabels = new ArrayList<>();
        for (Token t : parseResult.getPostfixTokens()) {
            postfixLabels.add(t.getDisplayLabel());
        }
        response.setPostfixTokens(postfixLabels);
        response.setParsingTrace(parseResult.getTraceSteps());
        response.setExpressionTree(root);
        response.setTextTree(treeBuilder.toTextTree(root));
        response.setIntermediateCalculations(evalResult.getIntermediateCalculations());
        response.setCalculationSteps(evalResult.getCalculationSteps());
        response.setPostfixEvaluationTrace(evalResult.getPostfixEvaluationTrace());
        response.setResult(evalResult.getValue());
        response.setFormattedResult(evalResult.getFormattedValue());
        response.setVariablesUsed(usedVars);
        response.setPreorderTraversal(treeBuilder.preorder(root));
        response.setInorderTraversal(treeBuilder.inorder(root));
        response.setPostorderTraversal(treeBuilder.postorder(root));
        response.setExecutionTimeMicros(elapsedMicros);

        return response;
    }

    private Map<String, Double> collectUsedVariables(List<Token> classifiedTokens, Map<String, Double> scope) {
        Map<String, Double> usedVars = new LinkedHashMap<>();
        for (Token token : classifiedTokens) {
            if (token.getType() == Token.Type.VARIABLE) {
                usedVars.put(token.getValue(), scope.get(token.getValue()));
            }
        }
        return usedVars;
    }

    private String buildResolvedExpression(List<Token> tokens, Map<String, Double> scope) {
        StringBuilder sb = new StringBuilder();
        Token prev = null;
        for (Token t : tokens) {
            Token.Type type = t.getType();
            if (prev != null) {
                if (prev.getType() == Token.Type.UNARY_OPERATOR
                        || prev.getType() == Token.Type.LEFT_PAREN
                        || type == Token.Type.RIGHT_PAREN) {
                    // no space after unary '-' or '(' or before ')'
                } else {
                    sb.append(' ');
                }
            }

            if (type == Token.Type.VARIABLE) {
                double val = scope.get(t.getValue());
                String formatted = ExpressionEvaluator.formatNumber(val);
                if (val < 0) {
                    sb.append('(').append(formatted).append(')');
                } else {
                    sb.append(formatted);
                }
            } else {
                sb.append(t.getValue());
            }
            prev = t;
        }
        return sb.toString();
    }
}

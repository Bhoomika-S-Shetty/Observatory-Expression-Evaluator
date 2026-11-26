package com.observatory.model;

import java.util.List;
import java.util.Map;

public class ValidationResult {
    private boolean valid;
    private String status;
    private String message;
    private String stage;
    private Integer position;
    private int tokenCount;
    private List<Token> tokens;
    private String postfixExpression;
    private String resolvedExpression;
    private Map<String, Double> variablesUsed;

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStage() {
        return stage;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public int getTokenCount() {
        return tokenCount;
    }

    public void setTokenCount(int tokenCount) {
        this.tokenCount = tokenCount;
    }

    public List<Token> getTokens() {
        return tokens;
    }

    public void setTokens(List<Token> tokens) {
        this.tokens = tokens;
    }

    public String getPostfixExpression() {
        return postfixExpression;
    }

    public void setPostfixExpression(String postfixExpression) {
        this.postfixExpression = postfixExpression;
    }

    public String getResolvedExpression() {
        return resolvedExpression;
    }

    public void setResolvedExpression(String resolvedExpression) {
        this.resolvedExpression = resolvedExpression;
    }

    public Map<String, Double> getVariablesUsed() {
        return variablesUsed;
    }

    public void setVariablesUsed(Map<String, Double> variablesUsed) {
        this.variablesUsed = variablesUsed;
    }
}

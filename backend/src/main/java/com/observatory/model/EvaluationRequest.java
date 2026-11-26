package com.observatory.model;

import java.util.Map;

public class EvaluationRequest {
    private String expression;
    private Map<String, Double> variables;

    public String getExpression() {
        return expression;
    }

    public void setExpression(String expression) {
        this.expression = expression;
    }

    public Map<String, Double> getVariables() {
        return variables;
    }

    public void setVariables(Map<String, Double> variables) {
        this.variables = variables;
    }
}

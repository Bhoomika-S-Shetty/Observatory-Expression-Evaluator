package com.observatory.model;

import java.util.List;

public class TraceStep {
    private int step;
    private String token;
    private String tokenType;
    private String stack;
    private List<String> stackItems;
    private String postfix;
    private List<String> postfixItems;
    private String action;
    private String operationType; // PUSH, POP, OUTPUT, DISCARD, COMPLETE

    public TraceStep(
            int step,
            String token,
            String tokenType,
            String stack,
            List<String> stackItems,
            String postfix,
            List<String> postfixItems,
            String action,
            String operationType) {
        this.step = step;
        this.token = token;
        this.tokenType = tokenType;
        this.stack = stack;
        this.stackItems = stackItems;
        this.postfix = postfix;
        this.postfixItems = postfixItems;
        this.action = action;
        this.operationType = operationType;
    }

    public int getStep() {
        return step;
    }

    public String getToken() {
        return token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getStack() {
        return stack;
    }

    public List<String> getStackItems() {
        return stackItems;
    }

    public String getPostfix() {
        return postfix;
    }

    public List<String> getPostfixItems() {
        return postfixItems;
    }

    public String getAction() {
        return action;
    }

    public String getOperationType() {
        return operationType;
    }
}

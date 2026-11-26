package com.observatory.model;

public class ExpressionNode {
    private String id;
    private String value;
    private String type; // NUMBER, VARIABLE, OPERATOR, UNARY_OPERATOR
    private String evaluatedValue;
    private ExpressionNode left;
    private ExpressionNode right;

    public ExpressionNode(String id, String value, String type) {
        this.id = id;
        this.value = value;
        this.type = type;
    }

    public ExpressionNode(String id, String value, String type, ExpressionNode left, ExpressionNode right) {
        this.id = id;
        this.value = value;
        this.type = type;
        this.left = left;
        this.right = right;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getEvaluatedValue() {
        return evaluatedValue;
    }

    public void setEvaluatedValue(String evaluatedValue) {
        this.evaluatedValue = evaluatedValue;
    }

    public ExpressionNode getLeft() {
        return left;
    }

    public void setLeft(ExpressionNode left) {
        this.left = left;
    }

    public ExpressionNode getRight() {
        return right;
    }

    public void setRight(ExpressionNode right) {
        this.right = right;
    }
}

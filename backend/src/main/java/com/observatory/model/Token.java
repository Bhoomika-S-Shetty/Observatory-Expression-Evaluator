package com.observatory.model;

public class Token {
    public enum Type {
        NUMBER,
        VARIABLE,
        OPERATOR,
        UNARY_OPERATOR,
        LEFT_PAREN,
        RIGHT_PAREN
    }

    private final Type type;
    private final String value;
    private final int position;

    public Token(Type type, String value, int position) {
        this.type = type;
        this.value = value;
        this.position = position;
    }

    public Type getType() {
        return type;
    }

    public String getValue() {
        return value;
    }

    public int getPosition() {
        return position;
    }

    public boolean isBinaryOperator() {
        return type == Type.OPERATOR;
    }

    public boolean isUnaryOperator() {
        return type == Type.UNARY_OPERATOR;
    }

    public boolean isOperator() {
        return type == Type.OPERATOR || type == Type.UNARY_OPERATOR;
    }

    public boolean isOperand() {
        return type == Type.NUMBER || type == Type.VARIABLE;
    }

    public String getDisplayLabel() {
        if (type == Type.UNARY_OPERATOR) {
            return "NEG";
        }
        return value;
    }

    public String getSemanticLabel() {
        if (type == Type.UNARY_OPERATOR) {
            return "UNARY_MINUS";
        }
        if (type == Type.LEFT_PAREN) {
            return "LEFT_PARENTHESIS";
        }
        if (type == Type.RIGHT_PAREN) {
            return "RIGHT_PARENTHESIS";
        }
        if (type == Type.VARIABLE) {
            return "VARIABLE(" + value + ")";
        }
        if (type == Type.NUMBER) {
            return "NUMBER(" + value + ")";
        }
        if (type == Type.OPERATOR) {
            switch (value) {
                case "+":
                    return "PLUS";
                case "-":
                    return "MINUS";
                case "*":
                    return "MULTIPLY";
                case "/":
                    return "DIVIDE";
                default:
                    return "OPERATOR(" + value + ")";
            }
        }
        return type.name();
    }
}

package com.observatory.exception;

public class ExpressionException extends RuntimeException {
    private final String stage;
    private final Integer position;

    public ExpressionException(String message, String stage) {
        this(message, stage, null);
    }

    public ExpressionException(String message, String stage, Integer position) {
        super(message);
        this.stage = stage;
        this.position = position;
    }

    public String getStage() {
        return stage;
    }

    public Integer getPosition() {
        return position;
    }
}

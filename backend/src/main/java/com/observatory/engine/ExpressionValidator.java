package com.observatory.engine;

import com.observatory.exception.ExpressionException;
import com.observatory.model.Token;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Stack;

@Component
public class ExpressionValidator {

    public List<Token> validateAndClassify(List<Token> rawTokens, Map<String, Double> variables) {
        if (rawTokens == null || rawTokens.isEmpty()) {
            throw new ExpressionException("Expression cannot be empty.", "VALIDATION", 0);
        }

        if (rawTokens.size() > Tokenizer.MAX_TOKENS) {
            throw new ExpressionException(
                    "Expression exceeds maximum limit of " + Tokenizer.MAX_TOKENS + " tokens.",
                    "VALIDATION",
                    rawTokens.get(Tokenizer.MAX_TOKENS).getPosition()
            );
        }

        List<Token> classified = new ArrayList<>();
        Stack<Integer> leftParenPositions = new Stack<>();
        boolean expectingOperand = true;
        Token prevToken = null;

        for (int i = 0; i < rawTokens.size(); i++) {
            Token current = rawTokens.get(i);
            Token.Type type = current.getType();

            if (type == Token.Type.LEFT_PAREN) {
                if (!expectingOperand) {
                    throw new ExpressionException(
                            "Missing operator before '(' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                leftParenPositions.push(current.getPosition());
                classified.add(current);
                expectingOperand = true;
            } else if (type == Token.Type.RIGHT_PAREN) {
                if (prevToken != null && prevToken.getType() == Token.Type.LEFT_PAREN) {
                    throw new ExpressionException(
                            "Empty parentheses '()' are not allowed at position " + prevToken.getPosition() + ".",
                            "VALIDATION",
                            prevToken.getPosition()
                    );
                }
                if (expectingOperand) {
                    String afterLabel = prevToken != null ? describeOperator(prevToken) : "opening parenthesis";
                    throw new ExpressionException(
                            "Missing operand after " + afterLabel + " before ')' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                if (leftParenPositions.isEmpty()) {
                    throw new ExpressionException(
                            "Missing opening parenthesis: unmatched ')' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                leftParenPositions.pop();
                classified.add(current);
                expectingOperand = false;
            } else if (type == Token.Type.NUMBER) {
                if (!expectingOperand) {
                    throw new ExpressionException(
                            "Missing operator before number '" + current.getValue() + "' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                try {
                    double parsed = Double.parseDouble(current.getValue());
                    if (Double.isNaN(parsed) || Double.isInfinite(parsed)) {
                        throw new ExpressionException(
                                "Numeric value '" + current.getValue() + "' is out of range at position " + current.getPosition() + ".",
                                "VALIDATION",
                                current.getPosition()
                        );
                    }
                } catch (NumberFormatException ex) {
                    throw new ExpressionException(
                            "Invalid numerical format '" + current.getValue() + "' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                classified.add(current);
                expectingOperand = false;
            } else if (type == Token.Type.VARIABLE) {
                if (!expectingOperand) {
                    throw new ExpressionException(
                            "Missing operator before variable '" + current.getValue() + "' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                if (variables == null || !variables.containsKey(current.getValue())) {
                    throw new ExpressionException(
                            "Undefined variable: '" + current.getValue() + "' at position " + current.getPosition() + ".",
                            "VALIDATION",
                            current.getPosition()
                    );
                }
                classified.add(current);
                expectingOperand = false;
            } else if (type == Token.Type.OPERATOR) {
                if (expectingOperand) {
                    if ("-".equals(current.getValue())) {
                        Token unaryMinus = new Token(Token.Type.UNARY_OPERATOR, "-", current.getPosition());
                        classified.add(unaryMinus);
                        expectingOperand = true;
                    } else if (prevToken == null) {
                        throw new ExpressionException(
                                "Expression cannot begin with " + describeOperator(current) + " at position " + current.getPosition() + ".",
                                "VALIDATION",
                                current.getPosition()
                        );
                    } else if (prevToken.isOperator()) {
                        throw new ExpressionException(
                                "Missing operand after " + describeOperator(prevToken) + ": consecutive binary operators '" + prevToken.getValue() + "' and '" + current.getValue() + "' at position " + current.getPosition() + ".",
                                "VALIDATION",
                                current.getPosition()
                        );
                    } else {
                        throw new ExpressionException(
                                "Missing operand before " + describeOperator(current) + " at position " + current.getPosition() + ".",
                                "VALIDATION",
                                current.getPosition()
                        );
                    }
                } else {
                    classified.add(current);
                    expectingOperand = true;
                }
            }

            prevToken = classified.get(classified.size() - 1);
        }

        if (!leftParenPositions.isEmpty()) {
            int unclosedPos = leftParenPositions.peek();
            throw new ExpressionException(
                    "Missing closing parenthesis: " + leftParenPositions.size() + " unclosed '(' starting at position " + unclosedPos + ".",
                    "VALIDATION",
                    unclosedPos
            );
        }

        if (expectingOperand) {
            String opDesc = prevToken != null ? describeOperator(prevToken) : "operator";
            int pos = prevToken != null ? prevToken.getPosition() : 0;
            throw new ExpressionException(
                    "Expression ends with " + opDesc + ": missing operand at position " + pos + ".",
                    "VALIDATION",
                    pos
            );
        }

        return classified;
    }

    private String describeOperator(Token token) {
        if (token.getType() == Token.Type.UNARY_OPERATOR) {
            return "unary minus operator '-'";
        }
        switch (token.getValue()) {
            case "+":
                return "addition operator '+'";
            case "-":
                return "subtraction operator '-'";
            case "*":
                return "multiplication operator '*'";
            case "/":
                return "division operator '/'";
            default:
                return "operator '" + token.getValue() + "'";
        }
    }

    public void validateVariableAssignment(
            String name,
            Double value,
            Map<String, Double> existingVariables,
            boolean allowOverwrite) {
        if (name == null || name.isEmpty()) {
            throw new ExpressionException("Variable name cannot be empty.", "VARIABLE_VALIDATION");
        }

        char first = name.charAt(0);
        boolean validStart = (first >= 'a' && first <= 'z') || (first >= 'A' && first <= 'Z') || first == '_';
        if (!validStart) {
            throw new ExpressionException(
                    "Invalid variable name '" + name + "': must start with a letter or underscore.",
                    "VARIABLE_VALIDATION"
            );
        }

        for (int i = 1; i < name.length(); i++) {
            char c = name.charAt(i);
            boolean validPart = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
            if (!validPart) {
                throw new ExpressionException(
                        "Invalid variable name '" + name + "': contains illegal character '" + c + "'.",
                        "VARIABLE_VALIDATION"
                );
            }
        }

        if ("NEG".equals(name)) {
            throw new ExpressionException(
                    "Variable name 'NEG' is reserved for internal unary negation.",
                    "VARIABLE_VALIDATION"
            );
        }

        if (value == null || Double.isNaN(value) || Double.isInfinite(value)) {
            throw new ExpressionException(
                    "Variable '" + name + "' must have a valid finite numeric value.",
                    "VARIABLE_VALIDATION"
            );
        }

        if (!allowOverwrite && existingVariables != null && existingVariables.containsKey(name)) {
            throw new ExpressionException(
                    "Duplicate variable assignment rejected: '" + name + "' is already defined.",
                    "VARIABLE_VALIDATION"
            );
        }
    }
}

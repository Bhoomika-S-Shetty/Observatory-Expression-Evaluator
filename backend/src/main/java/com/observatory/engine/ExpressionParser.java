package com.observatory.engine;

import com.observatory.exception.ExpressionException;
import com.observatory.model.Token;
import com.observatory.model.TraceStep;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

@Component
public class ExpressionParser {

    public static class ParseResult {
        private final List<Token> postfixTokens;
        private final List<TraceStep> traceSteps;
        private final String postfixExpression;

        public ParseResult(List<Token> postfixTokens, List<TraceStep> traceSteps, String postfixExpression) {
            this.postfixTokens = postfixTokens;
            this.traceSteps = traceSteps;
            this.postfixExpression = postfixExpression;
        }

        public List<Token> getPostfixTokens() {
            return postfixTokens;
        }

        public List<TraceStep> getTraceSteps() {
            return traceSteps;
        }

        public String getPostfixExpression() {
            return postfixExpression;
        }
    }

    public ParseResult toPostfix(List<Token> tokens) {
        Stack<Token> operatorStack = new Stack<>();
        List<Token> postfixOutput = new ArrayList<>();
        List<TraceStep> trace = new ArrayList<>();
        int stepCounter = 1;

        for (Token token : tokens) {
            Token.Type type = token.getType();

            if (type == Token.Type.NUMBER || type == Token.Type.VARIABLE) {
                postfixOutput.add(token);
                trace.add(createStep(
                        stepCounter++,
                        token.getDisplayLabel(),
                        type.name(),
                        operatorStack,
                        postfixOutput,
                        "Append operand '" + token.getValue() + "' directly to postfix output",
                        "OUTPUT"
                ));
            } else if (type == Token.Type.LEFT_PAREN) {
                operatorStack.push(token);
                trace.add(createStep(
                        stepCounter++,
                        "(",
                        type.name(),
                        operatorStack,
                        postfixOutput,
                        "Push '(' onto operator stack",
                        "PUSH"
                ));
            } else if (type == Token.Type.RIGHT_PAREN) {
                boolean foundMatchingLeft = false;
                while (!operatorStack.isEmpty()) {
                    Token top = operatorStack.peek();
                    if (top.getType() == Token.Type.LEFT_PAREN) {
                        operatorStack.pop();
                        foundMatchingLeft = true;
                        trace.add(createStep(
                                stepCounter++,
                                ")",
                                type.name(),
                                operatorStack,
                                postfixOutput,
                                "Pop and discard matching '(' from operator stack",
                                "DISCARD"
                        ));
                        break;
                    } else {
                        Token popped = operatorStack.pop();
                        postfixOutput.add(popped);
                        trace.add(createStep(
                                stepCounter++,
                                ")",
                                type.name(),
                                operatorStack,
                                postfixOutput,
                                "Pop '" + popped.getDisplayLabel() + "' from stack and append to postfix",
                                "POP"
                        ));
                    }
                }
                if (!foundMatchingLeft) {
                    throw new ExpressionException(
                            "Unmatched closing parenthesis ')' at position " + token.getPosition() + ".",
                            "PARSING"
                    );
                }
            } else if (type == Token.Type.OPERATOR || type == Token.Type.UNARY_OPERATOR) {
                int currentPrec = getPrecedence(token);
                boolean isRightAssoc = isRightAssociative(token);

                while (!operatorStack.isEmpty()) {
                    Token top = operatorStack.peek();
                    if (top.getType() == Token.Type.LEFT_PAREN) {
                        break;
                    }

                    int topPrec = getPrecedence(top);
                    boolean shouldPop = isRightAssoc ? (topPrec > currentPrec) : (topPrec >= currentPrec);

                    if (shouldPop) {
                        Token popped = operatorStack.pop();
                        postfixOutput.add(popped);
                        trace.add(createStep(
                                stepCounter++,
                                token.getDisplayLabel(),
                                type.name(),
                                operatorStack,
                                postfixOutput,
                                "Pop higher/equal precedence '" + popped.getDisplayLabel() + "' (prec " + topPrec + ") to postfix",
                                "POP"
                        ));
                    } else {
                        break;
                    }
                }

                operatorStack.push(token);
                trace.add(createStep(
                        stepCounter++,
                        token.getDisplayLabel(),
                        type.name(),
                        operatorStack,
                        postfixOutput,
                        "Push " + (type == Token.Type.UNARY_OPERATOR ? "unary operator 'NEG'" : "operator '" + token.getValue() + "'") + " (prec " + currentPrec + ") onto stack",
                        "PUSH"
                ));
            }
        }

        while (!operatorStack.isEmpty()) {
            Token top = operatorStack.pop();
            if (top.getType() == Token.Type.LEFT_PAREN || top.getType() == Token.Type.RIGHT_PAREN) {
                throw new ExpressionException("Mismatched parentheses remaining on stack.", "PARSING");
            }
            postfixOutput.add(top);
            trace.add(createStep(
                    stepCounter++,
                    "EOF",
                    "END",
                    operatorStack,
                    postfixOutput,
                    "Flush remaining '" + top.getDisplayLabel() + "' from stack to postfix",
                    "POP"
            ));
        }

        String postfixExpression = formatTokens(postfixOutput);
        trace.add(createStep(
                stepCounter,
                "DONE",
                "COMPLETE",
                operatorStack,
                postfixOutput,
                "Shunting Yard complete — Postfix ready: " + postfixExpression,
                "COMPLETE"
        ));

        return new ParseResult(postfixOutput, trace, postfixExpression);
    }

    private int getPrecedence(Token token) {
        if (token.getType() == Token.Type.UNARY_OPERATOR) {
            return 3;
        }
        String op = token.getValue();
        if ("*".equals(op) || "/".equals(op)) {
            return 2;
        }
        if ("+".equals(op) || "-".equals(op)) {
            return 1;
        }
        return 0;
    }

    private boolean isRightAssociative(Token token) {
        return token.getType() == Token.Type.UNARY_OPERATOR;
    }

    private TraceStep createStep(
            int step,
            String tokenLabel,
            String tokenType,
            Stack<Token> stack,
            List<Token> postfix,
            String action,
            String operationType) {
        List<String> stackItems = new ArrayList<>();
        for (Token t : stack) {
            stackItems.add(t.getDisplayLabel());
        }
        List<String> postfixItems = new ArrayList<>();
        for (Token t : postfix) {
            postfixItems.add(t.getDisplayLabel());
        }
        return new TraceStep(
                step,
                tokenLabel,
                tokenType,
                formatList(stackItems),
                stackItems,
                formatList(postfixItems),
                postfixItems,
                action,
                operationType
        );
    }

    private String formatTokens(List<Token> list) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(" ");
            sb.append(list.get(i).getDisplayLabel());
        }
        return sb.toString();
    }

    private String formatList(List<String> list) {
        if (list.isEmpty()) {
            return "∅";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(" ");
            sb.append(list.get(i));
        }
        return sb.toString();
    }
}

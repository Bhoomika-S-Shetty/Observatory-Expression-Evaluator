package com.observatory.engine;

import com.observatory.exception.ExpressionException;
import com.observatory.model.Token;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Tokenizer {
    public static final int MAX_TOKENS = 2000;

    public List<Token> tokenize(String input) {
        if (input == null) {
            throw new ExpressionException("Expression cannot be empty.", "TOKENIZATION", 0);
        }

        List<Token> tokens = new ArrayList<>();
        int length = input.length();
        int i = 0;

        while (i < length) {
            char ch = input.charAt(i);

            if (isWhitespace(ch)) {
                i++;
                continue;
            }

            if (isDigit(ch)) {
                int start = i;
                StringBuilder numBuilder = new StringBuilder();
                boolean seenDecimalPoint = false;

                while (i < length) {
                    char c = input.charAt(i);
                    if (isDigit(c)) {
                        numBuilder.append(c);
                        i++;
                    } else if (c == '.') {
                        if (seenDecimalPoint) {
                            throw new ExpressionException(
                                    "Malformed decimal number near '" + numBuilder + ".' at position " + start + ".",
                                    "TOKENIZATION",
                                    i
                            );
                        }
                        seenDecimalPoint = true;
                        numBuilder.append(c);
                        i++;
                        if (i >= length || !isDigit(input.charAt(i))) {
                            throw new ExpressionException(
                                    "Malformed decimal number '" + numBuilder + "' at position " + start + " (expected digit after decimal point).",
                                    "TOKENIZATION",
                                    start
                            );
                        }
                    } else {
                        break;
                    }
                }

                if (i < length && isIdentifierStart(input.charAt(i))) {
                    StringBuilder invalidId = new StringBuilder(numBuilder);
                    while (i < length && isIdentifierPart(input.charAt(i))) {
                        invalidId.append(input.charAt(i));
                        i++;
                    }
                    throw new ExpressionException(
                            "Invalid token '" + invalidId + "' at position " + start + " (identifiers cannot start with a digit).",
                            "TOKENIZATION",
                            start
                    );
                }

                tokens.add(new Token(Token.Type.NUMBER, numBuilder.toString(), start));
            } else if (ch == '.') {
                throw new ExpressionException(
                        "Malformed decimal number starting with '.' at position " + i + " (leading digit required, e.g. 0.5).",
                        "TOKENIZATION",
                        i
                );
            } else if (isIdentifierStart(ch)) {
                int start = i;
                StringBuilder varBuilder = new StringBuilder();
                while (i < length && isIdentifierPart(input.charAt(i))) {
                    varBuilder.append(input.charAt(i));
                    i++;
                }
                tokens.add(new Token(Token.Type.VARIABLE, varBuilder.toString(), start));
            } else if (ch == '+' || ch == '-' || ch == '*' || ch == '/') {
                tokens.add(new Token(Token.Type.OPERATOR, String.valueOf(ch), i));
                i++;
            } else if (ch == '(') {
                tokens.add(new Token(Token.Type.LEFT_PAREN, "(", i));
                i++;
            } else if (ch == ')') {
                tokens.add(new Token(Token.Type.RIGHT_PAREN, ")", i));
                i++;
            } else {
                throw new ExpressionException(
                        "Invalid character '" + ch + "' at position " + i + ".",
                        "TOKENIZATION",
                        i
                );
            }

            if (tokens.size() > MAX_TOKENS) {
                throw new ExpressionException(
                        "Expression exceeds the maximum limit of " + MAX_TOKENS + " tokens.",
                        "TOKENIZATION",
                        tokens.get(tokens.size() - 1).getPosition()
                );
            }
        }

        if (tokens.isEmpty()) {
            throw new ExpressionException("Expression cannot be empty.", "TOKENIZATION", 0);
        }

        return tokens;
    }

    private boolean isWhitespace(char ch) {
        return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r';
    }

    private boolean isDigit(char ch) {
        return ch >= '0' && ch <= '9';
    }

    private boolean isIdentifierStart(char ch) {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_';
    }

    private boolean isIdentifierPart(char ch) {
        return isIdentifierStart(ch) || isDigit(ch);
    }
}

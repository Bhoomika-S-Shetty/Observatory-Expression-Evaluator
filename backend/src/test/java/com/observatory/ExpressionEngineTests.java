package com.observatory;

import com.observatory.engine.*;
import com.observatory.exception.ExpressionException;
import com.observatory.model.EvaluationResponse;
import com.observatory.model.ExpressionNode;
import com.observatory.model.ValidationResult;
import com.observatory.service.ExpressionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class ExpressionEngineTests {

    private ExpressionService service;

    @BeforeEach
    void setUp() {
        service = new ExpressionService(
                new Tokenizer(),
                new ExpressionValidator(),
                new ExpressionParser(),
                new ExpressionTreeBuilder(),
                new ExpressionEvaluator()
        );
    }

    @Test
    void testBasicPrecedence() {
        EvaluationResponse res = service.evaluateIsolated("10+5*2", null);
        assertEquals(20.0, res.getResult(), 1e-9);
        assertEquals("10 5 2 * +", res.getPostfixExpression());
    }

    @Test
    void testParentheses() {
        EvaluationResponse res = service.evaluateIsolated("(10+5)*2", null);
        assertEquals(30.0, res.getResult(), 1e-9);
        assertEquals("10 5 + 2 *", res.getPostfixExpression());
    }

    @Test
    void testUnaryNegationAndIntermediateTrace() {
        Map<String, Double> vars = new HashMap<>();
        vars.put("a", 10.0);
        vars.put("b", 5.0);

        EvaluationResponse res = service.evaluateIsolated("-(a+b)*2+30/5", vars);
        assertEquals(-24.0, res.getResult(), 1e-9);
        assertEquals("-(10 + 5) * 2 + 30 / 5", res.getResolvedExpression());
        assertEquals("a b + NEG 2 * 30 5 / +", res.getPostfixExpression());
        assertEquals(5, res.getIntermediateCalculations().size());
        assertEquals("10 + 5 = 15", res.getIntermediateCalculations().get(0));
        assertEquals("NEG(15) = -15", res.getIntermediateCalculations().get(1));
        assertEquals("-15 * 2 = -30", res.getIntermediateCalculations().get(2));
        assertEquals("30 / 5 = 6", res.getIntermediateCalculations().get(3));
        assertEquals("-30 + 6 = -24", res.getIntermediateCalculations().get(4));

        // Verify stack snapshots and operand breakdown
        assertEquals("10", res.getCalculationSteps().get(0).getFirstOperand());
        assertEquals("5", res.getCalculationSteps().get(0).getSecondOperand());
        assertEquals("+", res.getCalculationSteps().get(0).getOperator());
        assertEquals(1, res.getCalculationSteps().get(0).getStackAfter().size());
        assertEquals("-24", res.getExpressionTree().getEvaluatedValue());
        assertNotNull(res.getTextTree());
        assertTrue(res.getTextTree().contains("+  [= -24]"));
    }

    @Test
    void testPromptRequiredArithmeticCases() {
        assertEquals(-15.0, service.evaluateIsolated("-5 * 3", null).getResult(), 1e-9);
        assertEquals(15.0, service.evaluateIsolated("10 - -5", null).getResult(), 1e-9);
        assertEquals(2.5, service.evaluateIsolated("10 / 4", null).getResult(), 1e-9);
        assertEquals(3.0, service.evaluateIsolated("((2 + 3) * (4 - 1)) / 5", null).getResult(), 1e-9);
        assertEquals(30.0, service.evaluateIsolated("((10 + 5) * (3 - 1))", null).getResult(), 1e-9);
    }

    @Test
    void testNegativeVarsAndNestedParens() {
        Map<String, Double> vars = new HashMap<>();
        vars.put("a", -8.0);
        vars.put("b", 4.0);
        vars.put("c", 2.0);

        EvaluationResponse res = service.evaluateIsolated("(a+b)*(c-(3+2))", vars);
        assertEquals(12.0, res.getResult(), 1e-9);
    }

    @Test
    void testUnaryEdgeCases() {
        assertEquals(-5.0, service.evaluateIsolated("-5", null).getResult(), 1e-9);
        assertEquals(5.0, service.evaluateIsolated("--5", null).getResult(), 1e-9);
        assertEquals(-10.0, service.evaluateIsolated("5*-2", null).getResult(), 1e-9);

        Map<String, Double> vars = new HashMap<>();
        vars.put("a", 3.0);
        vars.put("b", 4.0);
        assertEquals(-7.0, service.evaluateIsolated("-(a+b)", vars).getResult(), 1e-9);
        assertEquals(-14.0, service.evaluateIsolated("-(a+b)*2", vars).getResult(), 1e-9);
    }

    @Test
    void testDecimalNumbers() {
        EvaluationResponse res = service.evaluateIsolated("3.5 * 2 - 1.25 / 0.5", null);
        assertEquals(4.5, res.getResult(), 1e-9);
    }

    @Test
    void testTreeStructureForUnary() {
        EvaluationResponse res = service.evaluateIsolated("-5", null);
        ExpressionNode root = res.getExpressionTree();
        assertEquals("NEG", root.getValue());
        assertEquals("-5", root.getEvaluatedValue());
        assertNotNull(root.getLeft());
        assertNull(root.getRight());
        assertEquals("5", root.getLeft().getValue());
    }

    @Test
    void testValidationAndComparisonEndpoints() {
        ValidationResult validRes = service.validateExpression("10 + 5 * 2", null);
        assertTrue(validRes.isValid());
        assertEquals("10 5 2 * +", validRes.getPostfixExpression());

        ValidationResult invalidRes = service.validateExpression("10 + *", null);
        assertFalse(invalidRes.isValid());
        assertNotNull(invalidRes.getPosition());

        Map<String, Object> cmp = service.compareExpressions("10 + 5 * 2", "(10 + 5) * 2", null);
        assertEquals(Boolean.TRUE, cmp.get("comparable"));
        assertEquals(Boolean.FALSE, cmp.get("resultsEqual"));
        assertEquals("10", cmp.get("formattedDifference"));
    }

    @Test
    void testErrorCases() {
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("10/(5-5)", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("10 / 0", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("(10+5", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("10+5)", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("a+b", Map.of("a", 10.0)));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("2+*3", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("10+*", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("1.2.3+4", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("10 + 5 ^ 2", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("* 5 + 2", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("10+", null));
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated("()", null));
    }

    @Test
    void testMaxTokenLimit2000() {
        StringBuilder underLimit = new StringBuilder("1");
        // 1 + 999 * ("+1") = 1999 tokens <= 2000
        for (int i = 0; i < 999; i++) {
            underLimit.append("+1");
        }
        EvaluationResponse ok = service.evaluateIsolated(underLimit.toString(), null);
        assertEquals(1000.0, ok.getResult(), 1e-9);

        // 2001 tokens > 2000
        underLimit.append("+1");
        assertThrows(ExpressionException.class, () -> service.evaluateIsolated(underLimit.toString(), null));
    }
}

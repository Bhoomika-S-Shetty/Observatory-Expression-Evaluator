package com.observatory.controller;

import com.observatory.exception.ExpressionException;
import com.observatory.model.EvaluationRequest;
import com.observatory.model.EvaluationResponse;
import com.observatory.model.ValidationResult;
import com.observatory.service.ExpressionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ExpressionController {

    private final ExpressionService expressionService;

    public ExpressionController(ExpressionService expressionService) {
        this.expressionService = expressionService;
    }

    public static class VariablePayload {
        private String name;
        private Double value;
        private Boolean overwrite;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Double getValue() {
            return value;
        }

        public void setValue(Double value) {
            this.value = value;
        }

        public Boolean getOverwrite() {
            return overwrite;
        }

        public void setOverwrite(Boolean overwrite) {
            this.overwrite = overwrite;
        }
    }

    public static class ComparePayload {
        private String expression1;
        private String expression2;
        private Map<String, Double> variables;

        public String getExpression1() {
            return expression1;
        }

        public void setExpression1(String expression1) {
            this.expression1 = expression1;
        }

        public String getExpression2() {
            return expression2;
        }

        public void setExpression2(String expression2) {
            this.expression2 = expression2;
        }

        public Map<String, Double> getVariables() {
            return variables;
        }

        public void setVariables(Map<String, Double> variables) {
            this.variables = variables;
        }
    }

    public static class TestCasePayload {
        private String name;
        private String expression;
        private Map<String, Double> variables;
        private String expectedType; // VALUE or ERROR
        private Double expectedValue;
        private String expectedErrorContains;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

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

        public String getExpectedType() {
            return expectedType;
        }

        public void setExpectedType(String expectedType) {
            this.expectedType = expectedType;
        }

        public Double getExpectedValue() {
            return expectedValue;
        }

        public void setExpectedValue(Double expectedValue) {
            this.expectedValue = expectedValue;
        }

        public String getExpectedErrorContains() {
            return expectedErrorContains;
        }

        public void setExpectedErrorContains(String expectedErrorContains) {
            this.expectedErrorContains = expectedErrorContains;
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("engine", "Observatory Java DSA Engine");
        return ResponseEntity.ok(body);
    }

    @GetMapping("/variables")
    public ResponseEntity<Map<String, Object>> getVariables() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("variables", expressionService.getAllVariables());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/variables")
    public ResponseEntity<Map<String, Object>> addOrUpdateVariable(@RequestBody VariablePayload payload) {
        boolean allowOverwrite = payload.getOverwrite() == null || payload.getOverwrite();
        Map<String, Double> updated = expressionService.addOrUpdateVariable(
                payload.getName(),
                payload.getValue(),
                allowOverwrite
        );
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("variables", updated);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/variables/{name}")
    public ResponseEntity<Map<String, Object>> updateVariable(
            @PathVariable String name,
            @RequestBody VariablePayload payload) {
        Map<String, Double> updated = expressionService.addOrUpdateVariable(
                name,
                payload.getValue(),
                true
        );
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("variables", updated);
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/variables/{name}")
    public ResponseEntity<Map<String, Object>> deleteVariable(@PathVariable String name) {
        Map<String, Double> updated = expressionService.deleteVariable(name);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("variables", updated);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/validate")
    public ResponseEntity<ValidationResult> validate(@RequestBody EvaluationRequest request) {
        ValidationResult result = expressionService.validateExpression(
                request.getExpression(),
                request.getVariables()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/evaluate")
    public ResponseEntity<EvaluationResponse> evaluate(@RequestBody EvaluationRequest request) {
        EvaluationResponse response = expressionService.evaluateExpression(
                request.getExpression(),
                request.getVariables()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/compare")
    public ResponseEntity<Map<String, Object>> compare(@RequestBody ComparePayload request) {
        Map<String, Object> result = expressionService.compareExpressions(
                request.getExpression1(),
                request.getExpression2(),
                request.getVariables()
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/test/cases")
    public ResponseEntity<Map<String, Object>> getPredefinedTestCases() {
        List<TestCasePayload> suite = buildPredefinedTests();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("totalTests", suite.size());
        body.put("cases", suite);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> runSingleTest(@RequestBody TestCasePayload testCase) {
        Map<String, Object> result = executeTestCase(testCase);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/test/run-all")
    public ResponseEntity<Map<String, Object>> runAllTests() {
        List<TestCasePayload> suite = buildPredefinedTests();
        List<Map<String, Object>> results = new ArrayList<>();
        int passed = 0;
        int failed = 0;

        for (TestCasePayload tc : suite) {
            Map<String, Object> res = executeTestCase(tc);
            results.add(res);
            if (Boolean.TRUE.equals(res.get("passed"))) {
                passed++;
            } else {
                failed++;
            }
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("success", true);
        summary.put("totalTests", suite.size());
        summary.put("totalPassed", passed);
        summary.put("totalFailed", failed);
        summary.put("results", results);
        return ResponseEntity.ok(summary);
    }

    private Map<String, Object> executeTestCase(TestCasePayload tc) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", tc.getName());
        row.put("expression", tc.getExpression());
        row.put("variables", tc.getVariables() != null ? tc.getVariables() : Collections.emptyMap());

        String expectedOutput;
        if ("ERROR".equalsIgnoreCase(tc.getExpectedType())) {
            expectedOutput = "Error: " + tc.getExpectedErrorContains();
        } else {
            expectedOutput = com.observatory.engine.ExpressionEvaluator.formatNumber(
                    tc.getExpectedValue() != null ? tc.getExpectedValue() : 0.0
            );
        }
        row.put("expectedOutput", expectedOutput);
        row.put("expectedType", tc.getExpectedType());

        try {
            EvaluationResponse eval = expressionService.evaluateIsolated(
                    tc.getExpression(),
                    tc.getVariables()
            );
            row.put("actualOutput", eval.getFormattedResult());
            row.put("actualNumeric", eval.getResult());
            row.put("postfixExpression", eval.getPostfixExpression());
            row.put("executionTimeMicros", eval.getExecutionTimeMicros());
            row.put("evaluationDetails", eval);

            boolean isPass = false;
            if ("VALUE".equalsIgnoreCase(tc.getExpectedType()) && tc.getExpectedValue() != null && eval.getResult() != null) {
                isPass = Math.abs(eval.getResult() - tc.getExpectedValue()) < 1e-9;
            }
            row.put("passed", isPass);
            row.put("status", isPass ? "PASS" : "FAIL");
        } catch (ExpressionException ex) {
            row.put("actualOutput", ex.getMessage());
            row.put("errorStage", ex.getStage());

            boolean isPass = false;
            if ("ERROR".equalsIgnoreCase(tc.getExpectedType())) {
                String expectedSub = tc.getExpectedErrorContains() != null ? tc.getExpectedErrorContains().toLowerCase() : "";
                isPass = ex.getMessage() != null && ex.getMessage().toLowerCase().contains(expectedSub);
            }
            row.put("passed", isPass);
            row.put("status", isPass ? "PASS" : "FAIL");
        } catch (Exception ex) {
            row.put("actualOutput", "Unexpected error: " + ex.getMessage());
            row.put("passed", false);
            row.put("status", "FAIL");
        }

        return row;
    }

    private List<TestCasePayload> buildPredefinedTests() {
        List<TestCasePayload> list = new ArrayList<>();

        list.add(makeValueTest("Operator Precedence", "10+5*2", null, 20.0));
        list.add(makeValueTest("Parentheses Grouping", "(10+5)*2", null, 30.0));

        Map<String, Double> vars3 = new LinkedHashMap<>();
        vars3.put("a", 10.0);
        vars3.put("b", 5.0);
        list.add(makeValueTest("Observatory Formula (Unary & Vars)", "-(a+b)*2+30/5", vars3, -24.0));

        list.add(makeValueTest("Unary Multiplication", "-5*3", null, -15.0));
        list.add(makeValueTest("Subtraction of Unary Negative", "10--5", null, 15.0));
        list.add(makeValueTest("Real-Valued Division", "10/4", null, 2.5));
        list.add(makeValueTest("Deeply Nested Parentheses", "((2+3)*(4-1))/5", null, 3.0));

        Map<String, Double> vars4 = new LinkedHashMap<>();
        vars4.put("a", -8.0);
        vars4.put("b", 4.0);
        vars4.put("c", 2.0);
        list.add(makeValueTest("Negative Variable & Nested Parens", "(a+b)*(c-(3+2))", vars4, 12.0));

        list.add(makeValueTest("Double Unary Negation", "--5", null, 5.0));
        list.add(makeValueTest("Multiply by Negative Operand", "5*-2", null, -10.0));
        list.add(makeValueTest("Decimal Precision Arithmetic", "7.5*2-1.25/0.5", null, 12.5));

        // Error Detection Suite
        list.add(makeErrorTest("Division by Zero Guard", "10/(5-5)", null, "Division by zero"));
        list.add(makeErrorTest("Missing Closing Parenthesis", "(10+5", null, "Missing closing parenthesis"));
        list.add(makeErrorTest("Missing Opening Parenthesis", "10+5)", null, "Missing opening parenthesis"));
        list.add(makeErrorTest("Empty Parentheses", "()", null, "Empty parentheses"));

        Map<String, Double> vars7 = new LinkedHashMap<>();
        vars7.put("a", 10.0);
        list.add(makeErrorTest("Undefined Variable Detection", "a+b", vars7, "Undefined variable"));

        list.add(makeErrorTest("Consecutive Binary Operators", "10+*", null, "Consecutive binary operators"));
        list.add(makeErrorTest("Invalid Character Rejection", "10+5^2", null, "Invalid character"));
        list.add(makeErrorTest("Malformed Decimal Number", "1.2.3+4", null, "Malformed decimal"));
        list.add(makeErrorTest("Trailing Operator Detection", "10+", null, "missing operand"));

        // 2001 tokens limit rejection
        StringBuilder overLimit = new StringBuilder("1");
        for (int i = 0; i < 1000; i++) {
            overLimit.append("+1");
        }
        list.add(makeErrorTest("Exceed 2,000 Token Limit", overLimit.toString(), null, "maximum limit of 2000 tokens"));

        return list;
    }

    private TestCasePayload makeValueTest(String name, String expr, Map<String, Double> vars, double expected) {
        TestCasePayload tc = new TestCasePayload();
        tc.setName(name);
        tc.setExpression(expr);
        tc.setVariables(vars);
        tc.setExpectedType("VALUE");
        tc.setExpectedValue(expected);
        return tc;
    }

    private TestCasePayload makeErrorTest(String name, String expr, Map<String, Double> vars, String expectedError) {
        TestCasePayload tc = new TestCasePayload();
        tc.setName(name);
        tc.setExpression(expr);
        tc.setVariables(vars);
        tc.setExpectedType("ERROR");
        tc.setExpectedErrorContains(expectedError);
        return tc;
    }
}

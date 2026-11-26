package com.observatory.exception;

import com.observatory.model.EvaluationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ExpressionException.class)
    public ResponseEntity<EvaluationResponse> handleExpressionException(ExpressionException ex) {
        EvaluationResponse response = new EvaluationResponse();
        response.setSuccess(false);
        response.setStatus("ERROR");
        response.setErrorMessage(ex.getMessage());
        response.setErrorStage(ex.getStage());
        response.setErrorPosition(ex.getPosition());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleBadJson(HttpMessageNotReadableException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("status", "ERROR");
        body.put("errorStage", "REQUEST");
        body.put("errorMessage", "Malformed JSON request payload or invalid numeric value.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("status", "ERROR");
        body.put("errorStage", "INTERNAL");
        body.put("errorMessage", ex.getMessage() != null ? ex.getMessage() : "Unexpected processing error.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}

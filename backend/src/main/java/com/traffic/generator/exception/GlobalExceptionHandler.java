package com.traffic.generator.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);

        String code = "INVALID_INPUT";
        String message = "입력값이 올바르지 않습니다.";
        String field = null;

        if (fieldError != null) {
            field = fieldError.getField();
            message = fieldError.getDefaultMessage();
            code = "INVALID_" + field.toUpperCase();
        }

        var error = field != null
                ? Map.of("code", code, "message", message, "field", field)
                : Map.of("code", code, "message", message);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", error));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", Map.of(
                        "code", "INTERNAL_ERROR",
                        "message", "서버 내부 오류가 발생했습니다."
                )));
    }
}

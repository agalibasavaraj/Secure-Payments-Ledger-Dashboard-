package com.yourname.ledger.common;

import com.yourname.ledger.common.exceptions.GlobalExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsInvalidRequestsToBadRequest() {
        HttpServletRequest request = request();

        var response = handler.handleIllegalArgument(
                new IllegalArgumentException("Invalid amount"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Invalid amount", response.getBody().get("message"));
    }

    @Test
    void doesNotExposeUnexpectedExceptionDetailsToClients() {
        HttpServletRequest request = request();

        var response = handler.handleGeneralException(
                new IllegalStateException("database password must not be exposed"), request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("An unexpected error occurred", response.getBody().get("message"));
    }

    private HttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/example");
        return request;
    }
}

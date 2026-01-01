package edu.sabanciuniv.cs308.backend.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

public class WebSocketUserHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            @NonNull ServerHttpRequest request,
            @NonNull WebSocketHandler wsHandler,
            @NonNull Map<String, Object> attributes
    ) {
        Object userId = attributes.get("USER_ID");
        if (userId != null) return () -> "user:" + userId;

        Object email = attributes.get("USER_EMAIL");
        if (email != null) return () -> "user:" + email; // fallback

        Object sessionId = attributes.get("SESSION_ID");
        if (sessionId != null) return () -> "guest:" + sessionId;

        return () -> "guest:" + UUID.randomUUID();
    }
}
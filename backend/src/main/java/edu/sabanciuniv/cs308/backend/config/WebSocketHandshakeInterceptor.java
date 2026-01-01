package edu.sabanciuniv.cs308.backend.config;

import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.Optional;

@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final UserRepository userRepository;

    public WebSocketHandshakeInterceptor(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            @NonNull Map<String, Object> attributes
    ) {
        if (request instanceof ServletServerHttpRequest servletReq) {
            HttpServletRequest httpReq = servletReq.getServletRequest();
            HttpSession session = httpReq.getSession(false);

            if (session != null) {
                attributes.put("SESSION_ID", session.getId());

                Object ctxObj = session.getAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY
                );

                if (ctxObj instanceof SecurityContext ctx) {
                    Authentication auth = ctx.getAuthentication();
                    if (auth != null && auth.isAuthenticated()) {
                        String email = auth.getName(); // AccountController da bunu kullanıyor
                        attributes.put("USER_EMAIL", email);

                        // Optional: userId'yi de otomatik bağla
                        Optional<UserEntity> userOpt = userRepository.findByEmailAddress(email);
                        userOpt.ifPresent(u -> attributes.put("USER_ID", u.getId()));
                    }
                }
            }
        }
        return true;
    }

    @Override
    public void afterHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            Exception exception
    ) {
        // no-op
    }
}
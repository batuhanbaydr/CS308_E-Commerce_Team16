package edu.sabanciuniv.cs308.controller;

import edu.sabanciuniv.cs308.enumtype.UserRole;
import edu.sabanciuniv.cs308.model.dto.UserDTO;
import edu.sabanciuniv.cs308.model.entity.UserEntity;
import edu.sabanciuniv.cs308.model.request.UserRequest;
import edu.sabanciuniv.cs308.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody UserRequest req) {
        if (userRepository.existsByEmailAddress(req.getEmailAddress())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        UserEntity user = new UserEntity();
        user.setName(req.getName());
        user.setEmailAddress(req.getEmailAddress());
        user.setHomeAddress(req.getHomeAddress());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        // Varsayılan rol: CUSTOMER (istersen frontend’den göndertebilirsin)
        user.setRole(UserRole.CUSTOMER);

        user = userRepository.save(user);

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmailAddress(user.getEmailAddress());
        dto.setHomeAddress(user.getHomeAddress());
        dto.setRole(user.getRole().name());

        return ResponseEntity.created(URI.create("/api/users/me")).body(dto);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("emailAddress");
        String password = payload.get("password");

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        request.getSession(true); // JSESSIONID oluştur

        return ResponseEntity.ok(Map.of("message", "Logged in"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }
}

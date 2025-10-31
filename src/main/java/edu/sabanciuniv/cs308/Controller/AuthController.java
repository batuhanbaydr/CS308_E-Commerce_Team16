package edu.sabanciuniv.cs308.Controller;

import edu.sabanciuniv.cs308.Entity.UserEntity;
import edu.sabanciuniv.cs308.Enum.UserRole;
import edu.sabanciuniv.cs308.Model.UserRequest;
import edu.sabanciuniv.cs308.Repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Setter
@Getter
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
    public ResponseEntity<?> registerUser(@RequestBody UserRequest req) {
        if (userRepository.existsByEmailAddress(req.getEmailAddress())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already in use"));
        }

        UserEntity user = new UserEntity();
        user.setName(req.getName());
        user.setEmailAddress(req.getEmailAddress());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setHomeAddress(req.getHomeAddress());
        user.setRole(UserRole.CUSTOMER);

        userRepository.save(user);
        return ResponseEntity.status(201).body(Map.of("message", "User registered"));
    }

    // JSON login: { "emailAddress": "...", "password": "..." }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String email = body.get("emailAddress");
        String password = body.get("password");

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

package edu.sabanciuniv.cs308.backend.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.enums.UserRole;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.LoginRequest;
import edu.sabanciuniv.cs308.backend.request.SignupRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

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
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        System.out.println(">>> SIGNUP hit for: " + req.getEmailAddress());

        Optional<UserEntity> existing = userRepository.findByEmailAddress(req.getEmailAddress());
        if (existing.isPresent()) {
            return ResponseEntity.status(409).body(Map.of("message", "Email already in use"));
        }

        UserEntity u = new UserEntity();
        u.setName(req.getName());
        u.setEmailAddress(req.getEmailAddress());
        u.setHomeAddress(req.getHomeAddress());
        u.setPassword(passwordEncoder.encode(req.getPassword()));
        if (u.getRole() == null) {
            u.setRole(UserRole.CUSTOMER);
        }

        userRepository.save(u);
        System.out.println(">>> SIGNUP success for: " + req.getEmailAddress());
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    // IMPORTANT!! we create session here
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req,
                                   HttpServletRequest httpRequest) {
        System.out.println(">>> LOGIN attempt for: " + req.getEmailAddress());
        try {
            // authenticate user
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            req.getEmailAddress(),
                            req.getPassword()
                    )
            );

            // create a fresh security context and put the auth in it
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);

            // create/get HTTP session and store the security context in it
            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(
                    HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    context
            );

            System.out.println(">>> LOGIN success for: " + req.getEmailAddress());
            return ResponseEntity.ok(Map.of("message", "Login successful"));

        } catch (BadCredentialsException e) {
            System.out.println(">>> LOGIN failed (bad credentials) for: " + req.getEmailAddress());
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password"));
        } catch (Exception e) {
            System.out.println(">>> LOGIN failed (other error): " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("message", "Login error"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // you can also invalidate session here if you want
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }
}

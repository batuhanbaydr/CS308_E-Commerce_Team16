package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.UserDTO;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.UpdateAccountRequest;
import edu.sabanciuniv.cs308.backend.request.ChangePasswordRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountController(UserRepository userRepository,
                             PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // 4.1 Mevcut hesap bilgileri (profil kartı)
    @GetMapping
    public ResponseEntity<?> getMe(Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        String email = auth.getName();
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmailAddress(user.getEmailAddress());
        dto.setHomeAddress(user.getHomeAddress());
        dto.setRole(user.getRole().name());
        dto.setPhoneNumber(user.getPhoneNumber()); // UserDTO'ya bu alanı eklemiştik

        return ResponseEntity.ok(dto);
    }

    // 4.2 Email & Phone güncelle
    @PutMapping
    public ResponseEntity<?> updateContact(Authentication auth,
                                           @RequestBody UpdateAccountRequest body) {
        if (auth == null || !auth.isAuthenticated())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        if (body.getEmailAddress() == null || body.getEmailAddress().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message","emailAddress is required"));

        // mevcut kullanıcıyı çek
        String currentEmail = auth.getName();
        UserEntity user = userRepository.findByEmailAddress(currentEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // e-mail değişiyor ise çakışma kontrolü
        String newEmail = body.getEmailAddress().trim();
        if (!newEmail.equalsIgnoreCase(user.getEmailAddress())) {
            boolean clash = userRepository.existsByEmailAddressIgnoreCaseAndIdNot(newEmail, user.getId());
            if (clash) return ResponseEntity.status(409).body(Map.of("message","Email already in use"));
            user.setEmailAddress(newEmail);
            // Not: Spring Security session'daki principal adı eski email kalır; frontende "email değiştiyse re-login yap" mesajı gösterebiliriz.
        }

        // phoneNumber opsiyonel
        if (body.getPhoneNumber() != null)
            user.setPhoneNumber(body.getPhoneNumber().trim());

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message","Account updated",
                "emailAddress", user.getEmailAddress(),
                "phoneNumber", user.getPhoneNumber()
        ));
    }

    // 4.3 Şifre değiştir
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication auth,
                                            @RequestBody ChangePasswordRequest body) {
        if (auth == null || !auth.isAuthenticated())
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        if (body.getCurrentPassword()==null || body.getNewPassword()==null ||
            body.getCurrentPassword().isBlank() || body.getNewPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message","Both currentPassword and newPassword are required"));
        }

        String email = auth.getName();
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Mevcut şifre doğru mu?
        if (!passwordEncoder.matches(body.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("message","Current password is incorrect"));
        }

        // Basit bir kural örneği
        if (body.getNewPassword().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message","New password must be at least 6 characters"));
        }

        user.setPassword(passwordEncoder.encode(body.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message","Password changed"));
    }
}
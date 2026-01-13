package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.UserDTO;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.ProfileUpdateRequest;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Data
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    public UserController(UserRepository userRepository) { this.userRepository = userRepository; }

    private UserDTO toDto(UserEntity user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmailAddress(user.getEmailAddress());
        dto.setHomeAddress(user.getHomeAddress());
        dto.setRole(user.getRole().name());
        dto.setAddresses(user.getAddresses());
        return dto;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        String email = authentication.getName();
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(toDto(user));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(Authentication authentication,
                                      @RequestBody ProfileUpdateRequest req) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        String email = authentication.getName();
        Optional<UserEntity> userOpt = userRepository.findByEmailAddress(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        UserEntity user = userOpt.get();

        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName());
        }
        if (req.getHomeAddress() != null) {
            user.setHomeAddress(req.getHomeAddress());
        }
        if (req.getAddresses() != null) {
            user.setAddresses(req.getAddresses());
        }

        if (req.getEmailAddress() != null && !req.getEmailAddress().isBlank()) {
            if (!req.getEmailAddress().equalsIgnoreCase(user.getEmailAddress()) &&
                    userRepository.existsByEmailAddress(req.getEmailAddress())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Email already in use"));
            }
            user.setEmailAddress(req.getEmailAddress());
        }

        userRepository.save(user);
        return ResponseEntity.ok(toDto(user));
    }

    /**
     * ✅ NEW: Bulk resolve ids -> displayName (for backoffice Orders)
     * Always returns 200. Missing users simply not included in the map.
     *
     * GET /api/users/resolve?ids=a,b,c
     * -> { "a": "Zeynep", "b": "batuhan@mail.com" }
     */
    @GetMapping("/resolve")
    @PreAuthorize("hasRole('PRODUCT_MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> resolveUsers(
            @RequestParam String ids,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        List<String> idList = Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());

        if (idList.isEmpty()) return ResponseEntity.ok(Collections.emptyMap());

        // 1) try by Mongo _id
        List<UserEntity> usersById = userRepository.findAllById(idList);

        Map<String, String> result = new HashMap<>();
        for (UserEntity u : usersById) {
            String display = (u.getName() != null && !u.getName().isBlank())
                    ? u.getName()
                    : (u.getEmailAddress() != null ? u.getEmailAddress() : u.getId());
            result.put(u.getId(), display);
        }

        // 2) fallback: if some orders stored email instead of id
        Set<String> missing = new HashSet<>(idList);
        missing.removeAll(result.keySet());
        for (String maybeEmail : missing) {
            userRepository.findByEmailAddress(maybeEmail).ifPresent(u -> {
                String display = (u.getName() != null && !u.getName().isBlank())
                        ? u.getName()
                        : (u.getEmailAddress() != null ? u.getEmailAddress() : maybeEmail);
                result.put(maybeEmail, display); // key is what frontend requested
            });
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Optional: keep single lookup (debug)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('PRODUCT_MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable String id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        Optional<UserEntity> byId = userRepository.findById(id);
        if (byId.isPresent()) return ResponseEntity.ok(toDto(byId.get()));

        Optional<UserEntity> byEmail = userRepository.findByEmailAddress(id);
        if (byEmail.isPresent()) return ResponseEntity.ok(toDto(byEmail.get()));

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "User not found"));
    }
}

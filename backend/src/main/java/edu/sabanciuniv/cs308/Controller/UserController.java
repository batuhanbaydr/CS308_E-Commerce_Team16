package edu.sabanciuniv.cs308.controller;

import com.nilbezer.cs308.Model.Entity.UserEntity;
import com.nilbezer.cs308.Repository.UserRepository;
import com.nilbezer.cs308.Model.DTO.UserDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    public UserController(UserRepository userRepository) { this.userRepository = userRepository; }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }

        String email = authentication.getName(); // loadUserByUsername'de emailAddress döndürmüştük
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmailAddress(user.getEmailAddress());
        dto.setHomeAddress(user.getHomeAddress());
        dto.setRole(user.getRole().name());

        return ResponseEntity.ok(dto);
    }
}

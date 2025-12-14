package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.WishlistResponseDTO;
import edu.sabanciuniv.cs308.backend.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;


@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<WishlistResponseDTO> get(Authentication auth) {
        String userId = resolveUserId(auth);
        return ResponseEntity.ok(wishlistService.getWishlist(userId));
    }

    @PostMapping("/items/{productId}")
    public ResponseEntity<WishlistResponseDTO> add(@PathVariable String productId, Authentication auth) {
        String userId = resolveUserId(auth);
        return ResponseEntity.ok(wishlistService.addItem(userId, productId));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<WishlistResponseDTO> remove(@PathVariable String productId, Authentication auth) {
        String userId = resolveUserId(auth);
        return ResponseEntity.ok(wishlistService.removeItem(userId, productId));
    }

    @DeleteMapping
    public ResponseEntity<WishlistResponseDTO> clear(Authentication auth) {
        String userId = resolveUserId(auth);
        return ResponseEntity.ok(wishlistService.clear(userId));
    }

    private String resolveUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        // En basit hali: principal name dönüyor (çoğu projede email olur)
        // Sizde userId doğrudan name ise tamam.
        return auth.getName();
    }
}

package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.WishlistResponseDTO;
import edu.sabanciuniv.cs308.backend.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<WishlistResponseDTO> get(Authentication auth) {
        String userKey = resolveUserKey(auth);
        return ResponseEntity.ok(wishlistService.getWishlist(userKey));
    }

    @PostMapping("/items/{productId}")
    public ResponseEntity<WishlistResponseDTO> add(@PathVariable String productId, Authentication auth) {
        String userKey = resolveUserKey(auth);
        return ResponseEntity.ok(wishlistService.addItem(userKey, productId));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<WishlistResponseDTO> remove(@PathVariable String productId, Authentication auth) {
        String userKey = resolveUserKey(auth);
        return ResponseEntity.ok(wishlistService.removeItem(userKey, productId));
    }

    @DeleteMapping
    public ResponseEntity<WishlistResponseDTO> clear(Authentication auth) {
        String userKey = resolveUserKey(auth);
        return ResponseEntity.ok(wishlistService.clear(userKey));
    }

    /**
     * NOTE:
     * auth.getName() is often the user's email in Spring Security.
     * Your WishlistEntity.userId will therefore store that value unless you map it differently.
     */
    private String resolveUserKey(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return auth.getName();
    }
}

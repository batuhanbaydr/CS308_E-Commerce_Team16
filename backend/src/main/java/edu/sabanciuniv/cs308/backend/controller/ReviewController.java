// src/main/java/edu/sabanciuniv/cs308/backend/controller/ReviewController.java
package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.ReviewEntity;
import edu.sabanciuniv.cs308.backend.dto.CreateReviewRequest;
import edu.sabanciuniv.cs308.backend.dto.UpdateCommentModerationRequest;
import edu.sabanciuniv.cs308.backend.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    // CUSTOMER: review oluştur (rating + opsiyonel comment)
    @PostMapping
    public ResponseEntity<?> createReview(Authentication auth,
                                          @RequestBody CreateReviewRequest req) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        try {
            ReviewEntity review = reviewService.createReview(auth.getName(), req);
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    // Herkes: bir ürünün review'larını görür
    // (rating her zaman, comment sadece APPROVED)
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ReviewEntity>> getReviewsForProduct(@PathVariable String productId) {
        return ResponseEntity.ok(reviewService.getReviewsForProduct(productId));
    }

    // --- Product Manager moderasyon endpoint'leri ---

    @GetMapping("/pending")
    public ResponseEntity<List<ReviewEntity>> listPending() {
        return ResponseEntity.ok(reviewService.listPendingComments());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ReviewEntity> approve(@PathVariable String id) {
        return ResponseEntity.ok(reviewService.approveComment(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ReviewEntity> reject(@PathVariable String id,
                                               @RequestBody(required = false) UpdateCommentModerationRequest body) {
        return ResponseEntity.ok(
                reviewService.rejectComment(id, body != null ? body.getModerationNote() : null)
        );
    }
}

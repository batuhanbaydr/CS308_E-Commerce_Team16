// src/main/java/edu/sabanciuniv/cs308/backend/service/ReviewService.java
package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.ReviewEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.enums.ReviewCommentStatus;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.ReviewRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.dto.CreateReviewRequest;
import edu.sabanciuniv.cs308.backend.dto.UpdateCommentModerationRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public ReviewService(ReviewRepository reviewRepository,
                         OrderRepository orderRepository,
                         UserRepository userRepository,
                         ProductRepository productRepository) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    private void updateProductRatingStats(String productId) {
        List<ReviewEntity> reviews = reviewRepository.findByProductId(productId);
        double avg = reviews.stream()
            .mapToInt(r -> r.getRating() == null ? 0 : r.getRating())
            .average()
            .orElse(0.0);
        int count = reviews.size();

        ProductEntity product = productRepository.findById(productId)
              .orElseThrow(() -> new RuntimeException("Product not found"));

         product.setAverageRating(avg);


         productRepository.save(product);
    }


    // CUSTOMER review bırakıyor
    public ReviewEntity createReview(String emailOfUser, CreateReviewRequest req) {
        // Rating sınırı (burayı 1–10 yapmak istersen condition'ı değiştirirsin)
        if (req.getRating() == null || req.getRating() < 1 || req.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        // User
        UserEntity user = userRepository.findByEmailAddress(emailOfUser)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Product gerçekten var mı
        ProductEntity product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // 🔥 CRITICAL PART: Bu user, bu ürünü DELIVERED bir siparişte almış mı?
        boolean delivered = orderRepository.existsByUserIdAndStatusAndItemsProductId(
                user.getId(),
                "DELIVERED",
                product.getId()
        );

        if (!delivered) {
            throw new IllegalStateException(
                    "You can only review products that you have purchased and that have been delivered."
            );
        }

        // Aynı user + product için review varsa update edelim (istersen engelleyebilirsin)
        ReviewEntity existing = reviewRepository
                .findByUserIdAndProductId(user.getId(), product.getId())
                .orElse(null);

        ReviewEntity review;
        if (existing != null) {
            review = existing;
            review.setRating(req.getRating());
            review.setUpdatedAt(Instant.now());

            if (req.getComment() != null && !req.getComment().isBlank()) {
                review.setComment(req.getComment().trim());
                review.setCommentStatus(ReviewCommentStatus.PENDING); // yeniden onaya gider
            } else {
                review.setComment(null);
                review.setCommentStatus(ReviewCommentStatus.NONE);
            }
        } else {
            review = new ReviewEntity();
            review.setProductId(product.getId());
            review.setUserId(user.getId());
            review.setRating(req.getRating());
            review.setCreatedAt(Instant.now());
            review.setUpdatedAt(Instant.now());

            if (req.getComment() != null && !req.getComment().isBlank()) {
                review.setComment(req.getComment().trim());
                review.setCommentStatus(ReviewCommentStatus.PENDING);
            } else {
                review.setComment(null);
                review.setCommentStatus(ReviewCommentStatus.NONE);
            }
        }

        ReviewEntity saved = reviewRepository.save(review);

        // 🔴 BURAYA EKLE
        updateProductRatingStats(product.getId());

        return saved;

    }

    // Product sayfasında gösterilecek review'lar
    // Rating her zaman, comment sadece APPROVED ise dolu dönüyor
    public List<ReviewEntity> getReviewsForProduct(String productId) {
        List<ReviewEntity> all = reviewRepository.findByProductId(productId);

        return all.stream()
                .peek(r -> {
                    if (r.getCommentStatus() != ReviewCommentStatus.APPROVED) {
                        r.setComment(null); // comment gösterme ama rating kalsın
                    }
                })
                .collect(Collectors.toList());
    }

    // --- Moderation: sadece PRODUCT_MANAGER ---

    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public List<ReviewEntity> listPendingComments() {
        return reviewRepository.findAll().stream()
                .filter(r -> r.getCommentStatus() == ReviewCommentStatus.PENDING)
                .collect(Collectors.toList());
    }

    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ReviewEntity approveComment(String reviewId) {
        ReviewEntity r = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));
        r.setCommentStatus(ReviewCommentStatus.APPROVED);
        r.setUpdatedAt(Instant.now());
        return reviewRepository.save(r);
    }

    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ReviewEntity rejectComment(String reviewId, String moderationNote) {
        ReviewEntity r = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));
        r.setCommentStatus(ReviewCommentStatus.REJECTED);
        r.setUpdatedAt(Instant.now());
        // moderationNote'u istersen loglamak için ReviewEntity'ye ek alan koyabilirsin
        return reviewRepository.save(r);
    }
}

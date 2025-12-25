package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.dto.ProductRatingAggregate;
import edu.sabanciuniv.cs308.backend.entity.ReviewEntity;
import edu.sabanciuniv.cs308.backend.enums.ReviewCommentStatus;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends MongoRepository<ReviewEntity, String> {

    List<ReviewEntity> findByProductId(String productId);

    Optional<ReviewEntity> findByUserIdAndProductId(String userId, String productId);

    // PM moderasyon: pending listesi için
    List<ReviewEntity> findByCommentStatus(ReviewCommentStatus status);

    @Aggregation(pipeline = {
            "{ $match: { productId: { $in: ?0 } } }",
            "{ $group: { _id: \"$productId\", averageRating: { $avg: \"$rating\" }, ratingCount: { $sum: 1 } } }",
            "{ $project: { _id: 0, productId: \"$_id\", averageRating: 1, ratingCount: 1 } }"
    })
    List<ProductRatingAggregate> calculateRatingsByProductIds(List<String> productIds);
}
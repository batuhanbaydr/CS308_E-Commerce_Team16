package edu.sabanciuniv.cs308.backend.entity;

import edu.sabanciuniv.cs308.backend.enums.ReviewCommentStatus;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("reviews")
public class ReviewEntity {

    @Id
    private String id;

    private String productId;  // ProductEntity.id
    private String userId;     // UserEntity.id

    private Integer rating;    // 1–5 arası (istersen 1–10’a çeviririz)

    private String comment;    // opsiyonel
    private ReviewCommentStatus commentStatus;

    private Instant createdAt;
    private Instant updatedAt;
}


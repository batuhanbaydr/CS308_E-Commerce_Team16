package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;

@Data
public class CreateReviewRequest {
    private String productId;
    private Integer rating;   // 1–5
    private String comment;   // opsiyonel
}

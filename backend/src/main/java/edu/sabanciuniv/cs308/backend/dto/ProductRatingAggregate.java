package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;

@Data
public class ProductRatingAggregate {
    private String productId;
    private Double averageRating;
    private Long ratingCount;
}


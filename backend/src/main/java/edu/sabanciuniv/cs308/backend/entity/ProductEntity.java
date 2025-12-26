package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Document("products")
public class ProductEntity {

    @Id
    private String id;

    private String name;
    private String description;
    private String category;
    private BigDecimal basePrice;

    private BigDecimal discountPercent;
    private Instant discountStartAt;
    private Instant discountEndAt;

    private String mainImageUrl;
    private List<String> imageUrls;

    private List<Variant> variants;

    private String fabric;
    private String madeIn;

    // DB'ye yazılmayacak, sadece response'ta dönecek
    @Transient
    private Double averageRating;

    @Transient
    private Long ratingCount;

    @Transient
    private BigDecimal effectiveBasePrice;

    private String warrantyStatus;
    private String distributorInfo;

    @Data
    public static class Variant {
        private String sku;
        private String size;
        private String color;
        private int stock;
        private BigDecimal price;

        @Transient
        private BigDecimal effectivePrice;
    }
}

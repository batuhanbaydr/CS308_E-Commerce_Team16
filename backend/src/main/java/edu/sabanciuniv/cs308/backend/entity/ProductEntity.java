package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;
import java.time.Instant;

@Data
@Document("products")
public class ProductEntity {

    @Id
    private String id;

    private String name;
    private String description;
    private String category;
    private BigDecimal basePrice;

    private String mainImageUrl;
    private List<String> imageUrls;

    private List<Variant> variants;

    private String fabric;
    private String madeIn;


    // Discount metadata (DB'ye yazılır)
    // 0-100 arası; null veya 0 ise indirim yok
    private BigDecimal discountPercent;
    private Instant discountStartAt;
    private Instant discountEndAt;


    // DB'ye yazılmayacak, sadece response'ta dönecek
    @Transient
    private Double averageRating;

    @Transient
    private Long ratingCount;


    // Response için opsiyonel alanlar (istersen kullan)
    @Transient
    private Boolean discountActive;

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
    }
}

package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data
@Document("products")
public class ProductEntity {

    @Id
    private String id;

    private String name;           // Ürün adı, örn: "Keten Elbise"
    private String description;    // Açıklama
    private String category;       // Örn: "Elbise", "Pantolon", "Bluz"
    private BigDecimal basePrice;  // Ana fiyat (örnek: 599.90)

    private String mainImageUrl;   // Ana görsel
    private List<String> imageUrls; // Ek görseller

    // Ürün varyantları (örnek: renk, beden)
    private List<Variant> variants;

    @Data
    public static class Variant {
        private String sku;        // Benzersiz stok kodu, örn: "ELB-BEYAZ-M"
        private String size;       // "XS", "S", "M", "L", "XL"
        private String color;      // "Beyaz", "Siyah"
        private int stock;         // Stok miktarı
        private BigDecimal price;  // Bu varyantın fiyatı (farklı olabilir)
    }
}

package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class OrderItem {
    private String productId;
    private String sku;
    private String name;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;

    // getters & setters... (Lombok)
}
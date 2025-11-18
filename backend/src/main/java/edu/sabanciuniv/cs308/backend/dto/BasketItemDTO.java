package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BasketItemDTO {

    private String productId;
    private String sku;
    private String name;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
}
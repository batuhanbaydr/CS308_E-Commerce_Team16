package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class BasketDTO {

    private String orderId;              // CART durumundaki OrderEntity.id
    private List<BasketItemDTO> items;
    private BigDecimal subtotal;         // sepetteki ürünlerin toplamı
}
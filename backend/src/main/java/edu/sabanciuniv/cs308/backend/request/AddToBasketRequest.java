package edu.sabanciuniv.cs308.backend.request;

import lombok.Data;

@Data
public class AddToBasketRequest {

    private String productId;   // ProductEntity.id
    private String sku;         // ProductEntity.Variant.sku
    private int quantity;
}
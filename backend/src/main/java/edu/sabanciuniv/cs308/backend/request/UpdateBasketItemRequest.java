package edu.sabanciuniv.cs308.backend.request;

import lombok.Data;

@Data
public class UpdateBasketItemRequest {

    private String productId;
    private String sku;
    private int quantity;   // 0 veya altı gelirse item’i sileriz
}
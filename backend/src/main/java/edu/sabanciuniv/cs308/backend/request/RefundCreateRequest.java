package edu.sabanciuniv.cs308.backend.request;

import lombok.Data;

import java.util.List;

@Data
public class RefundCreateRequest {

    private String orderId;
    private List<Item> items;

    @Data
    public static class Item {
        private String productId;
        private String sku;
        private int quantity;
        private String reason;
    }
}

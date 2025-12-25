package edu.sabanciuniv.cs308.backend.dto;

import edu.sabanciuniv.cs308.backend.entity.AddressSnapshot;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DeliveryItemDTO {
    private String deliveryId;              // orderId + sku
    private String orderId;

    private String customerId;              // order.userId
    private String productId;
    private String sku;

    private int quantity;
    private BigDecimal totalPrice;          // item.lineTotal (fallback: unitPrice*qty)

    private AddressSnapshot deliveryAddress;
    private boolean completed;              // order.status == DELIVERED

    private String orderStatus;             // bonus: UI kolaylığı
}
package edu.sabanciuniv.cs308.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Document("orders")
public class OrderEntity {
    @Id
    private String id;

    @Indexed
    private String userId;              // UserEntity.id (email değil!)
    private Instant createdAt;
    private String status;              // PLACED, SHIPPED, DELIVERED, CANCELLED

    private List<OrderItem> items;
    private Money totals;

    private AddressSnapshot shippingAddressSnapshot;
    private AddressSnapshot billingAddressSnapshot;

    private String paymentMethodRef;    // kaydedilmiş kartın id/token bilgisi

    // getters & setters... (Lombok)
}
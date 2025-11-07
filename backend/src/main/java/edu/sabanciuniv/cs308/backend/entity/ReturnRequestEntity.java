package edu.sabanciuniv.cs308.backend.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Document("returns")
public class ReturnRequestEntity {
    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String orderId;

    private List<String> orderItemIds; // iade istenen item id/sku/lineKey
    private String reason;             // enum/serbest
    private String status;             // REQUESTED, APPROVED, REJECTED, RECEIVED, REFUNDED

    private Instant createdAt;
    private Instant updatedAt;

    // getters & setters... (Lombok)
}
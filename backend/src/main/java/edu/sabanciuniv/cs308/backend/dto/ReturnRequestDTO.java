package edu.sabanciuniv.cs308.backend.dto;

import java.time.Instant;
import java.util.List;

public class ReturnRequestDTO {
    private String id;
    private String orderId;
    private List<String> orderItemIds;
    private String reason;
    private String status;
    private Instant createdAt;

    // getters & setters...

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public List<String> getOrderItemIds() { return orderItemIds; }
    public void setOrderItemIds(List<String> orderItemIds) { this.orderItemIds = orderItemIds; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
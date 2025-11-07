package edu.sabanciuniv.cs308.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class OrderSummaryDTO {
    private String id;
    private Instant createdAt;
    private String status;
    private BigDecimal grandTotal;

    // getters & setters...

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getGrandTotal() { return grandTotal; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }
}
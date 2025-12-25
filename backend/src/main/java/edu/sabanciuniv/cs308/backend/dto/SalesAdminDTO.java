package edu.sabanciuniv.cs308.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class SalesAdminDTO {

    @Data
    @AllArgsConstructor
    public static class DiscountResult {
        private int updatedProducts;
        private int notifiedUsers; // email count
    }

    @Data
    @AllArgsConstructor
    public static class InvoiceRow {
        private String orderId;
        private String userId;
        private Instant createdAt;
        private String status;
        private BigDecimal grandTotal;
    }

    @Data
    @AllArgsConstructor
    public static class RevenueProfitSummary {
        private BigDecimal revenue;
        private BigDecimal cost;
        private BigDecimal profit;
        private List<SeriesPoint> series;
    }

    @Data
    @AllArgsConstructor
    public static class SeriesPoint {
        private String bucket; // yyyy-MM-dd / yyyy-MM / yyyy-Wxx
        private BigDecimal revenue;
        private BigDecimal profit;
    }
}

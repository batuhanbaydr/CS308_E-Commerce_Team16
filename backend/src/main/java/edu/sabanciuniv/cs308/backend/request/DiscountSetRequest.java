package edu.sabanciuniv.cs308.backend.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
public class DiscountSetRequest {
    private List<String> productIds;
    private BigDecimal discountPercent; // 0-100
    private Instant startAt;            // optional
    private Instant endAt;              // optional
    private boolean notifyWishlistUsers;
}

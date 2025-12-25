package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class ApplyDiscountRequest {
    private List<String> productIds;
    private double discountRate; // 0.15 = %15
}

package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class Money {
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal shipping;
    private BigDecimal grandTotal;

    // getters & setters... (Lombok)
}
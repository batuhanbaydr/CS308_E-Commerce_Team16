package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;

@Data
public class PaymentMethod {
    private String id;         // UUID
    private String brand;      // VISA, MC
    private String last4;      // "1234"
    private int expMonth;
    private int expYear;
    private String holderName;
    private boolean isDefault;
    private String token;      // mock token
    private String nickname;   // "Kişisel", "Şirket"

    // getters & setters... (Lombok)
}
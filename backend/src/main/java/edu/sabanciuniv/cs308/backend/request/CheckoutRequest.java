package edu.sabanciuniv.cs308.backend.request;

import lombok.Data;

@Data
public class CheckoutRequest {

    private String cartId; // BasketDTO.orderId

    // -------- SHIPPING ADDRESS --------
    private String shippingFullName;
    private String shippingLine1;
    private String shippingLine2;
    private String shippingCity;
    private String shippingState;
    private String shippingCountry;
    private String shippingZipCode;
    private String shippingPhoneNumber;

    // -------- BILLING ADDRESS --------
    // true ise billing = shipping kopyalanacak
    private boolean useShippingAsBilling;

    private String billingFullName;
    private String billingLine1;
    private String billingLine2;
    private String billingCity;
    private String billingState;
    private String billingCountry;
    private String billingZipCode;
    private String billingPhoneNumber;

    // -------- PAYMENT (mock) --------
    private String cardHolderName;
    private String cardBrand;   // VISA, MC vs.
    private String cardLast4;   // "1234"
    private int cardExpMonth;
    private int cardExpYear;
}

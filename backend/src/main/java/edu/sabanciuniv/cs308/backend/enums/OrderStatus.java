package edu.sabanciuniv.cs308.backend.enums;

public enum OrderStatus {
    CART,          // sepette, henüz sipariş oluşmadı
    PROCESSING,    // ödeme alınmış, hazırlanıyor
    IN_TRANSIT,    // kargoda
    DELIVERED,  // teslim edildi
    CANCELLED
}
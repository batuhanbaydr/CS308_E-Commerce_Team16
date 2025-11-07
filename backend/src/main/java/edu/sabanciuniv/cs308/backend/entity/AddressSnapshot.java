package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;

@Data
public class AddressSnapshot {
    private String fullName;
    private String line1;
    private String line2;     // optional
    private String city;
    private String state;     // ilçe
    private String country;
    private String zipCode;
    private String phoneNumber;

    // getters & setters... (Lombok)
}
// Not: Buradaki AddressSnapshot sipariş anındaki adresin kopyasıdır. Profilde tuttuğumuz “adres listesi”nden bağımsızdır; geçmişteki sipariş değişmez.
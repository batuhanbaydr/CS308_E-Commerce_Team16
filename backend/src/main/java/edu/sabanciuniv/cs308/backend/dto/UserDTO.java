package edu.sabanciuniv.cs308.backend.dto;

import lombok.Data;

@Data
public class UserDTO {

    private String id;
    private String name;
    private String emailAddress;
    private String homeAddress;
    private String role;
    private String phoneNumber;

    // you had explicit getter/setter for phoneNumber — keeping it is harmless
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
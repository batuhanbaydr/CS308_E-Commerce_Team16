package edu.sabanciuniv.cs308.backend.dto;

import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import lombok.Data;

import java.util.List;

@Data
public class UserDTO {

    private String id;
    private String name;
    private String emailAddress;
    private String homeAddress;
    private String role;
    private String phoneNumber;

    private List<UserEntity.Address> addresses;

    // you had explicit getter/setter for phoneNumber — keeping it is harmless
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
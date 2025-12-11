package edu.sabanciuniv.cs308.backend.request;

import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import lombok.Data;

import java.util.List;
@Data
public class ProfileUpdateRequest {
    private String name;
    private String homeAddress;
    private String emailAddress; // optional: change email

    private List<UserEntity.Address> addresses;

    public String getName() { return name; }
    public String getHomeAddress() { return homeAddress; }
    public String getEmailAddress() { return emailAddress; }

    public void setName(String name) { this.name = name; }
    public void setHomeAddress(String homeAddress) { this.homeAddress = homeAddress; }
    public void setEmailAddress(String emailAddress) { this.emailAddress = emailAddress; }
}
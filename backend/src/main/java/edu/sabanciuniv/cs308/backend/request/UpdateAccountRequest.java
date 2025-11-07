package edu.sabanciuniv.cs308.backend.request;

public class UpdateAccountRequest {
    private String emailAddress;
    private String phoneNumber;

    public String getEmailAddress() { return emailAddress; }
    public void setEmailAddress(String emailAddress) { this.emailAddress = emailAddress; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
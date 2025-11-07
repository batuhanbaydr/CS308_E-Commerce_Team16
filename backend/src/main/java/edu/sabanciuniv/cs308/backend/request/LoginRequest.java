package edu.sabanciuniv.cs308.backend.request;

public class LoginRequest {
    private String emailAddress;
    private String password;

    public String getEmailAddress() { return emailAddress; }
    public void setEmailAddress(String emailAddress) { this.emailAddress = emailAddress; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
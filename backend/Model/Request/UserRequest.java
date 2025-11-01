package edu.sabanciuniv.cs308.Model.Request;

import lombok.Data;

@Data
public class UserRequest {
    private String name;
    private String emailAddress;
    private String password;
    private String homeAddress;
}


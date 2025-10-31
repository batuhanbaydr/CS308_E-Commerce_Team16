package edu.sabanciuniv.cs308.Model.DTO;
import lombok.Data;

@Data
public class UserDTO {

    private String id;
    private String name;
    private String emailAddress;
    private String homeAddress;
    private String role;
}

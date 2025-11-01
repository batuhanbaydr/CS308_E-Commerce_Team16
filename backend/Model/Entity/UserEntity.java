package edu.sabanciuniv.cs308.Model.Entity;

import edu.sabanciuniv.cs308.Enum.UserRole;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@Document(collection = "users")
public class UserEntity {

    @Id
    private String id;

    private String name;

    @Field("email")
    @Indexed(name = "email_1", unique = true)
    private String emailAddress;

    private String homeAddress;

    private String password;

    private UserRole role;
}

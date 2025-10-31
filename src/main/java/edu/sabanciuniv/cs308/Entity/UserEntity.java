package edu.sabanciuniv.cs308.Entity;

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
    private String id; // Mongo’da genelde String/ObjectId kullanılır

    private String name;

    @Field("email")                      // DB’deki alan adı
    @Indexed(name = "email_1", unique = true)
    private String emailAddress;

    private String homeAddress;

    private String password;

    private UserRole role;
}

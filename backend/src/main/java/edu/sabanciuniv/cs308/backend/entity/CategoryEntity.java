package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("categories")
public class CategoryEntity {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;
}
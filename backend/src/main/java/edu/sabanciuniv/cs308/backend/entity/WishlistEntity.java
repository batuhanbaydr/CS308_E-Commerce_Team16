package edu.sabanciuniv.cs308.backend.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Data
@Document("wishlists")
public class WishlistEntity {

    @Id
    private String id;

    private String userId;

    private Set<String> productIds = new HashSet<>();

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}

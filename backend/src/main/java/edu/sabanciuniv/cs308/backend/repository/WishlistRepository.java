package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface WishlistRepository extends MongoRepository<WishlistEntity, String> {

    /**
     * IMPORTANT:
     * We intentionally return a List (not Optional / single result)
     * because your database can contain duplicates for the same userId.
     * This avoids IncorrectResultSizeDataAccessException.
     */
    List<WishlistEntity> findAllByUserId(String userId);
}

package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.ReviewEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends MongoRepository<ReviewEntity, String> {

    List<ReviewEntity> findByProductId(String productId);

    Optional<ReviewEntity> findByUserIdAndProductId(String userId, String productId);
}


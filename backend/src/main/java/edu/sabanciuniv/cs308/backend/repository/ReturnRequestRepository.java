package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.ReturnRequestEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReturnRequestRepository extends MongoRepository<ReturnRequestEntity, String> {

    Page<ReturnRequestEntity> findByUserId(String userId, Pageable pageable);
}
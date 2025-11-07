package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<UserEntity, String> {

    boolean existsByEmailAddress(String emailAddress);

    boolean existsByEmailAddressIgnoreCaseAndIdNot(String emailAddress, String id);

    Optional<UserEntity> findByEmailAddress(String emailAddress);
}
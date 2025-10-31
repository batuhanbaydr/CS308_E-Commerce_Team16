package edu.sabanciuniv.cs308.Repository;

import edu.sabanciuniv.cs308.Entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<UserEntity, String> {

    boolean existsByEmailAddress(String emailAddress);

    Optional<UserEntity> findByEmailAddress(String emailAddress);
}

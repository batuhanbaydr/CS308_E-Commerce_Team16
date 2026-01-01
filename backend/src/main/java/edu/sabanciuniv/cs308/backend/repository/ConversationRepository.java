package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.ConversationEntity;
import edu.sabanciuniv.cs308.backend.enums.ConversationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConversationRepository extends MongoRepository<ConversationEntity, String> {

    List<ConversationEntity> findByStatusOrderByUpdatedAtDesc(ConversationStatus status);

    List<ConversationEntity> findByStatusInOrderByUpdatedAtDesc(List<ConversationStatus> statuses);

    List<ConversationEntity> findByUserIdOrderByUpdatedAtDesc(String userId);

    List<ConversationEntity> findByGuestSessionIdOrderByUpdatedAtDesc(String guestSessionId);
}
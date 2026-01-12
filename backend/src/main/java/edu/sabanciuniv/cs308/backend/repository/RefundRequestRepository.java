package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.RefundRequestEntity;
import edu.sabanciuniv.cs308.backend.enums.RefundStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RefundRequestRepository extends MongoRepository<RefundRequestEntity, String> {

    List<RefundRequestEntity> findAllByUserIdOrderByCreatedAtDesc(String userId);

    List<RefundRequestEntity> findAllByStatusOrderByCreatedAtDesc(RefundStatus status);

    List<RefundRequestEntity> findAllByOrderIdAndStatusIn(String orderId, List<RefundStatus> statuses);
}

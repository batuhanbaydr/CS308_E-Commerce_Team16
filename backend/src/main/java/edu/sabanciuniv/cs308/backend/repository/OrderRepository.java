package edu.sabanciuniv.cs308.backend.repository;

import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface OrderRepository extends MongoRepository<OrderEntity, String> {

    Page<OrderEntity> findByUserId(String userId, Pageable pageable);
    OrderEntity findByUserIdAndStatus(String userId, String status);

    boolean existsByUserIdAndStatusAndItemsProductId(
            String userId,
            String status,
            String productId
    );

    // ✅ invoices in date range
    List<OrderEntity> findByCreatedAtBetween(Instant start, Instant end);

    // ✅ revenue/profit: count only meaningful statuses
    List<OrderEntity> findByStatusInAndCreatedAtBetween(List<String> statuses, Instant start, Instant end);
}

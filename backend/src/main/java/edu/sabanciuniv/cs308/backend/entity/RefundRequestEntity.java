package edu.sabanciuniv.cs308.backend.entity;

import edu.sabanciuniv.cs308.backend.enums.RefundStatus;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Document("refund_requests")
public class RefundRequestEntity {

    @Id
    private String id;

    // owner + order
    @Indexed
    private String userId;          // UserEntity.id (NOT email)

    private String userEmail;       // snapshot for emailing (optional but handy)

    @Indexed
    private String orderId;

    // workflow
    private RefundStatus status;    // REQUESTED, APPROVED, DENIED, REFUNDED

    private Instant createdAt;      // when customer created request
    private Instant reviewedAt;     // when sales manager decided
    private Instant refundedAt;     // when marked refunded
    private Instant requestedAt;


    private String reviewedBy;      // sales manager (email or id)
    private String managerNote;     // approve/deny note
    private String customerNote;    // optional extra note from customer

    // selective items
    private List<RefundItem> items;

    // money snapshots (purchase-time amounts preserved)
    private BigDecimal refundSubtotal; // sum(items unitPriceAtPurchase * qty)
    private BigDecimal refundTax;      // proportional tax calculated from original order
    private BigDecimal refundAmount;   // subtotal + tax

    @Data
    public static class RefundItem {
        private String productId;
        private String sku;
        private int quantity;

        private String reason; // customer reason (optional)

        // preserve purchase-time price (AFTER discount)
        private BigDecimal unitPriceAtPurchase;
        private BigDecimal lineTotalAtPurchase;
    }
}

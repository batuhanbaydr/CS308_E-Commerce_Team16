package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.RefundRequestEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RefundEmailService {

    private static final Logger log = LoggerFactory.getLogger(RefundEmailService.class);

    private final JavaMailSender mailSender;
    private final ProductRepository productRepository;

    @Value("${app.mail.from:no-reply@tidl-store.com}")
    private String fromAddress;

    public void sendRefundApproved(UserEntity user, RefundRequestEntity rr) {
        String to = safeEmail(user, rr);
        if (to == null) {
            log.warn("Refund email skipped: no recipient. refundId={}", rr != null ? rr.getId() : null);
            return;
        }
        if (rr == null) {
            log.warn("Refund email skipped: refund request is null. to={}", to);
            return;
        }

        BigDecimal amount = rr.getRefundAmount() != null ? rr.getRefundAmount() : BigDecimal.ZERO;

        String subject = "Refund approved - Refund ID " + rr.getId();

        String body =
                "Hello " + safeName(user) + ",\n\n" +
                "Your refund request has been APPROVED.\n" +
                "Refund ID: " + rr.getId() + "\n" +
                "Order ID: " + rr.getOrderId() + "\n" +
                "Refunded amount: " + amount + "\n\n" +
                "Items:\n" +
                formatItems(rr) +
                "\n" +
                "Thank you.\n" +
                "— TIDL\n";

        sendPlainText(to, subject, body, rr.getId());
    }

    public void sendRefundDenied(UserEntity user, RefundRequestEntity rr) {
        String to = safeEmail(user, rr);
        if (to == null) {
            log.warn("Refund email skipped: no recipient. refundId={}", rr != null ? rr.getId() : null);
            return;
        }
        if (rr == null) {
            log.warn("Refund email skipped: refund request is null. to={}", to);
            return;
        }

        String subject = "Refund denied - Refund ID " + rr.getId();

        String managerNote = (rr.getManagerNote() == null || rr.getManagerNote().isBlank())
                ? "-"
                : rr.getManagerNote();

        String body =
                "Hello " + safeName(user) + ",\n\n" +
                "Your refund request has been DENIED.\n" +
                "Refund ID: " + rr.getId() + "\n" +
                "Order ID: " + rr.getOrderId() + "\n" +
                "Manager note: " + managerNote + "\n\n" +
                "Items:\n" +
                formatItems(rr) +
                "\n" +
                "Thank you.\n" +
                "— TIDL\n";

        sendPlainText(to, subject, body, rr.getId());
    }

    private void sendPlainText(String to, String subject, String body, String refundId) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom(fromAddress); // IMPORTANT: some SMTPs reject missing From
            msg.setSubject(subject);
            msg.setText(body);

            mailSender.send(msg);
            log.info("Refund email sent. to={} refundId={} subject={}", to, refundId, subject);
        } catch (Exception e) {
            // IMPORTANT: do not crash refund flow, but log so you can debug real SMTP issues
            log.warn("Failed to send refund email. to={} refundId={} subject={}", to, refundId, subject, e);
        }
    }

    private String formatItems(RefundRequestEntity rr) {
        if (rr.getItems() == null || rr.getItems().isEmpty()) return "-\n";

        StringBuilder sb = new StringBuilder();
        for (RefundRequestEntity.RefundItem it : rr.getItems()) {
            if (it == null) continue;

            String name = resolveProductName(it.getProductId()).orElse("Unknown product");

            sb.append("- ")
              .append(name)
              .append(" | sku=")
              .append(nullToDash(it.getSku()))
              .append(" | qty=")
              .append(it.getQuantity())
              .append(" | unitPaid=")
              .append(it.getUnitPriceAtPurchase() != null ? it.getUnitPriceAtPurchase() : BigDecimal.ZERO)
              .append("\n");
        }
        return sb.toString();
    }

    private Optional<String> resolveProductName(String productId) {
        try {
            if (productId == null || productId.isBlank()) return Optional.empty();
            ProductEntity p = productRepository.findById(productId).orElse(null);
            if (p == null) return Optional.empty();
            return Optional.ofNullable(p.getName());
        } catch (Exception e) {
            // If DB lookup fails, email should still be sent
            log.debug("resolveProductName failed for productId={}", productId, e);
            return Optional.empty();
        }
    }

    private String safeEmail(UserEntity user, RefundRequestEntity rr) {
        if (user != null && user.getEmailAddress() != null && !user.getEmailAddress().isBlank()) {
            return user.getEmailAddress();
        }
        if (rr != null && rr.getUserEmail() != null && !rr.getUserEmail().isBlank()) {
            return rr.getUserEmail();
        }
        return null;
    }

    private String safeName(UserEntity user) {
        if (user != null && user.getName() != null && !user.getName().isBlank()) return user.getName();
        return "Customer";
    }

    private String nullToDash(String s) {
        return (s == null || s.isBlank()) ? "-" : s;
    }
}

package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.RefundRequestEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.enums.OrderStatus;
import edu.sabanciuniv.cs308.backend.enums.RefundStatus;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.RefundRequestRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.RefundCreateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class RefundService {

    private final RefundRequestRepository refundRepo;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final RefundEmailService refundEmailService;

    public RefundService(RefundRequestRepository refundRepo,
                         OrderRepository orderRepository,
                         UserRepository userRepository,
                         ProductRepository productRepository,
                         RefundEmailService refundEmailService) {
        this.refundRepo = refundRepo;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.refundEmailService = refundEmailService;
    }

    // =========================================================
    // Compatibility methods (RefundController expects these)
    // =========================================================

    public List<RefundRequestEntity> listMyRefunds(String userEmail) {
        return listMyRefundRequests(userEmail);
    }

    @Transactional
    public RefundRequestEntity createRefund(String userEmail, RefundCreateRequest req) {
        return createRefundRequest(userEmail, req);
    }

    // =========================================================
    // Your real implementation
    // =========================================================

    public List<RefundRequestEntity> listMyRefundRequests(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new RuntimeException("Unauthorized");
        }
        UserEntity user = userRepository.findByEmailAddress(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return refundRepo.findAllByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public RefundRequestEntity createRefundRequest(String userEmail, RefundCreateRequest req) {

        if (userEmail == null || userEmail.isBlank()) throw new RuntimeException("Unauthorized");
        if (req == null) throw new RuntimeException("Request body is required");
        if (req.getOrderId() == null || req.getOrderId().isBlank()) throw new RuntimeException("orderId is required");
        if (req.getItems() == null || req.getItems().isEmpty()) throw new RuntimeException("items is required");

        UserEntity user = userRepository.findByEmailAddress(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrderEntity order = orderRepository.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getUserId() == null || !order.getUserId().equals(user.getId())) {
            throw new RuntimeException("Order does not belong to user");
        }

        if (order.getStatus() == null || !OrderStatus.DELIVERED.name().equals(order.getStatus())) {
            throw new RuntimeException("Refund is only allowed for DELIVERED orders");
        }

        if (order.getCreatedAt() == null) {
            throw new RuntimeException("Order createdAt missing, cannot validate 30-day rule");
        }

        Instant now = Instant.now();
        Instant deadline = order.getCreatedAt().plus(30, ChronoUnit.DAYS);
        if (now.isAfter(deadline)) {
            throw new RuntimeException("Refund window expired (30 days)");
        }

        // Build purchased map: key -> total purchased quantity
        Map<String, OrderItem> purchasedItemByKey = new HashMap<>();
        Map<String, Integer> purchasedQtyByKey = new HashMap<>();

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new RuntimeException("Order has no items");
        }

        for (OrderItem oi : order.getItems()) {
            if (oi == null) continue;

            String key = keyOf(oi.getProductId(), oi.getSku());
            if (key == null) continue;

            purchasedItemByKey.putIfAbsent(key, oi);
            purchasedQtyByKey.put(key,
                    purchasedQtyByKey.getOrDefault(key, 0) + Math.max(oi.getQuantity(), 0));
        }

        // Prevent requesting more than available, considering already open/approved/refunded requests
        List<RefundRequestEntity> existing = refundRepo.findAllByOrderIdAndStatusIn(
                order.getId(),
                List.of(RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.REFUNDED)
        );

        Map<String, Integer> alreadyRequestedQtyByKey = new HashMap<>();
        for (RefundRequestEntity ex : existing) {
            if (ex == null || ex.getItems() == null) continue;
            for (RefundRequestEntity.RefundItem it : ex.getItems()) {
                if (it == null) continue;
                String key = keyOf(it.getProductId(), it.getSku());
                if (key == null) continue;
                alreadyRequestedQtyByKey.put(key,
                        alreadyRequestedQtyByKey.getOrDefault(key, 0) + Math.max(it.getQuantity(), 0));
            }
        }

        RefundRequestEntity rr = new RefundRequestEntity();
        rr.setOrderId(order.getId());
        rr.setUserId(user.getId());
        rr.setUserEmail(userEmail);

        rr.setStatus(RefundStatus.REQUESTED);
        rr.setCreatedAt(now);
        rr.setRequestedAt(now);

        List<RefundRequestEntity.RefundItem> refundItems = new ArrayList<>();

        for (RefundCreateRequest.Item item : req.getItems()) {
            if (item == null) continue;

            String productId = item.getProductId();
            String sku = item.getSku();
            int qty = item.getQuantity();

            if (productId == null || productId.isBlank()) throw new RuntimeException("productId is required");
            if (sku == null || sku.isBlank()) throw new RuntimeException("sku is required");
            if (qty <= 0) throw new RuntimeException("quantity must be > 0");

            String key = keyOf(productId, sku);

            Integer purchasedQty = purchasedQtyByKey.get(key);
            if (purchasedQty == null || purchasedQty <= 0) {
                throw new RuntimeException("Item not found in order: " + productId + " / " + sku);
            }

            int already = alreadyRequestedQtyByKey.getOrDefault(key, 0);
            int available = purchasedQty - already;

            if (qty > available) {
                throw new RuntimeException("Refund quantity exceeds available for: " + productId + " / " + sku);
            }

            OrderItem oi = purchasedItemByKey.get(key);
            BigDecimal unit = (oi != null && oi.getUnitPrice() != null) ? oi.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = unit.multiply(BigDecimal.valueOf(qty));

            RefundRequestEntity.RefundItem rit = new RefundRequestEntity.RefundItem();
            rit.setProductId(productId);
            rit.setSku(sku);
            rit.setQuantity(qty);
            rit.setReason(item.getReason());

            // preserve purchase-time prices (already discounted)
            rit.setUnitPriceAtPurchase(unit);
            rit.setLineTotalAtPurchase(lineTotal);

            refundItems.add(rit);
        }

        rr.setItems(refundItems);
        return refundRepo.save(rr);
    }

    public List<RefundRequestEntity> listAllRefunds(RefundStatus status) {
        if (status == null) {
            return refundRepo.findAll();
        }
        return refundRepo.findAllByStatusOrderByCreatedAtDesc(status);
    }

    @Transactional
    public RefundRequestEntity decide(String refundId, boolean approve, String managerNote) {
        RefundRequestEntity rr = refundRepo.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund request not found"));

        if (rr.getStatus() != RefundStatus.REQUESTED) {
            throw new RuntimeException("Only REQUESTED refunds can be decided");
        }

        rr.setReviewedAt(Instant.now());
        rr.setManagerNote(managerNote);

        if (approve) {
            rr.setStatus(RefundStatus.APPROVED);
            rr = refundRepo.save(rr);
        } else {
            rr.setStatus(RefundStatus.DENIED);
            rr = refundRepo.save(rr);

            UserEntity user = userRepository.findById(rr.getUserId()).orElse(null);
            if (user != null) {
                refundEmailService.sendRefundDenied(user, rr);
            }
        }

        return rr;
    }

    @Transactional
    public RefundRequestEntity markRefunded(String refundId) {
        RefundRequestEntity rr = refundRepo.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund request not found"));

        if (rr.getStatus() != RefundStatus.APPROVED) {
            throw new RuntimeException("Only APPROVED refunds can be marked REFUNDED");
        }

        OrderEntity order = orderRepository.findById(rr.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // 1) add back to stock
        if (rr.getItems() != null) {
            for (RefundRequestEntity.RefundItem it : rr.getItems()) {
                if (it == null) continue;

                ProductEntity product = productRepository.findById(it.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + it.getProductId()));

                if (product.getVariants() == null) {
                    throw new RuntimeException("Product has no variants: " + it.getProductId());
                }

                ProductEntity.Variant variant = product.getVariants().stream()
                        .filter(v -> v != null && Objects.equals(v.getSku(), it.getSku()))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Variant not found: " + it.getSku()));

                int addQty = Math.max(it.getQuantity(), 0);
                Integer cur = variant.getStock();
                if (cur == null) cur = 0;
                variant.setStock(cur + addQty);

                productRepository.save(product);
            }
        }

        // 2) compute refund amount using purchase-time numbers stored in refund request
        BigDecimal refundSubtotal = BigDecimal.ZERO;
        if (rr.getItems() != null) {
            for (RefundRequestEntity.RefundItem it : rr.getItems()) {
                if (it == null) continue;

                BigDecimal lt = it.getLineTotalAtPurchase();
                if (lt == null) {
                    BigDecimal unit = (it.getUnitPriceAtPurchase() != null) ? it.getUnitPriceAtPurchase() : BigDecimal.ZERO;
                    lt = unit.multiply(BigDecimal.valueOf(Math.max(it.getQuantity(), 0)));
                }
                refundSubtotal = refundSubtotal.add(lt);
            }
        }

        BigDecimal taxRate = BigDecimal.ZERO;
        if (order.getTotals() != null
                && order.getTotals().getSubtotal() != null
                && order.getTotals().getTax() != null
                && order.getTotals().getSubtotal().compareTo(BigDecimal.ZERO) > 0) {

            taxRate = order.getTotals().getTax()
                    .divide(order.getTotals().getSubtotal(), 6, RoundingMode.HALF_UP);
        }

        BigDecimal refundTax = refundSubtotal.multiply(taxRate).setScale(4, RoundingMode.HALF_UP);
        BigDecimal refundAmount = refundSubtotal.add(refundTax).setScale(4, RoundingMode.HALF_UP);

        rr.setRefundSubtotal(refundSubtotal.setScale(4, RoundingMode.HALF_UP));
        rr.setRefundTax(refundTax);
        rr.setRefundAmount(refundAmount);

        rr.setStatus(RefundStatus.REFUNDED);
        rr.setRefundedAt(Instant.now());

        rr = refundRepo.save(rr);

        // 3) notify customer
        UserEntity user = userRepository.findById(rr.getUserId()).orElse(null);
        if (user != null) {
            refundEmailService.sendRefundApproved(user, rr);
        }

        return rr;
    }

    private String keyOf(String productId, String sku) {
        if (productId == null || productId.isBlank()) return null;
        if (sku == null || sku.isBlank()) return null;
        return productId + "::" + sku;
    }
}

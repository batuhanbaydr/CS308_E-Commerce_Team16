package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.enums.OrderStatus;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.service.OrderMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public OrderController(OrderRepository orderRepository,
                           UserRepository userRepository,
                           ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth,
                                  @RequestParam(required = false, defaultValue = "false") boolean me,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        if (!me) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only me=true is supported for now"));
        }

        String email = auth.getName();
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Page<OrderEntity> p = orderRepository.findByUserId(user.getId(), PageRequest.of(page, size));

        return ResponseEntity.ok(Map.of(
                "page", p.getNumber(),
                "size", p.getSize(),
                "totalElements", p.getTotalElements(),
                "content", p.getContent().stream().map(OrderMapper::toSummary).toList()
        ));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> detail(Authentication auth, @PathVariable String orderId) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String email = auth.getName();
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        OrderDetailDTO dto = OrderMapper.toDetail(order);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(Authentication auth, @PathVariable String orderId) {

        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        String email = auth.getName();
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        if (!OrderStatus.PROCESSING.name().equals(order.getStatus())) {
            return ResponseEntity.status(400).body(Map.of(
                    "message", "Order can only be cancelled when status is PROCESSING",
                    "currentStatus", order.getStatus()
            ));
        }

        // ✅ 1) STOCK RETURN (restore stock)
        List<OrderItem> items = order.getItems();
        if (items != null) {
            for (OrderItem item : items) {
                String productId = item.getProductId();
                String sku = item.getSku();
                int qty = item.getQuantity();

                if (productId == null || sku == null || qty <= 0) continue;

                ProductEntity product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

                boolean updated = false;
                if (product.getVariants() != null) {
                    for (ProductEntity.Variant v : product.getVariants()) {
                        if (sku.equals(v.getSku())) {
                            v.setStock(v.getStock() + qty);
                            updated = true;
                            break;
                        }
                    }
                }

                if (!updated) {
                    // SKU bulunamazsa istersen hata ver, istersen logla
                    throw new RuntimeException("Variant SKU not found: " + sku + " in product " + productId);
                }

                productRepository.save(product);
            }
        }

        // ✅ 2) CANCEL ORDER
        order.setStatus(OrderStatus.CANCELLED.name());
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of(
                "message", "Order cancelled successfully (stock restored)",
                "orderId", order.getId(),
                "status", order.getStatus()
        ));
    }
}
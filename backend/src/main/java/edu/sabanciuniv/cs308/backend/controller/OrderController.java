package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.service.OrderMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public OrderController(OrderRepository orderRepository,
                           UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    // GET /api/orders?me=true&page=0&size=10
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

    // GET /api/orders/{orderId}
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
}
package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.service.OrderMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/product/orders")
public class AdminProductOrderController {

    private final OrderRepository orderRepository;

    public AdminProductOrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // ✅ ADMIN DETAIL: PM/SM/Support can view ANY order
    // Security is typically already enforced in SecurityConfig for /api/admin/**
    @GetMapping("/{orderId}")
    public ResponseEntity<?> detail(@PathVariable String orderId) {

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        OrderDetailDTO dto = OrderMapper.toDetail(order);
        return ResponseEntity.ok(dto);
    }
}

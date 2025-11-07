package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.ReturnRequestDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.ReturnRequestEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ReturnRequestRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.NewReturnRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/returns")
public class ReturnController {

    private final ReturnRequestRepository returnRepo;
    private final UserRepository userRepo;
    private final OrderRepository orderRepo;

    public ReturnController(ReturnRequestRepository returnRepo,
                            UserRepository userRepo,
                            OrderRepository orderRepo) {
        this.returnRepo = returnRepo;
        this.userRepo = userRepo;
        this.orderRepo = orderRepo;
    }

    // GET /api/returns?me=true&page=0&size=10
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
        UserEntity user = userRepo.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Page<ReturnRequestEntity> p = returnRepo.findByUserId(user.getId(), PageRequest.of(page, size));

        return ResponseEntity.ok(Map.of(
                "page", p.getNumber(),
                "size", p.getSize(),
                "totalElements", p.getTotalElements(),
                "content", p.getContent().stream().map(e -> {
                    ReturnRequestDTO d = new ReturnRequestDTO();
                    d.setId(e.getId());
                    d.setOrderId(e.getOrderId());
                    d.setOrderItemIds(e.getOrderItemIds());
                    d.setReason(e.getReason());
                    d.setStatus(e.getStatus());
                    d.setCreatedAt(e.getCreatedAt());
                    return d;
                }).toList()
        ));
    }

    // POST /api/returns
    @PostMapping
    public ResponseEntity<?> create(Authentication auth, @RequestBody NewReturnRequest req) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String email = auth.getName();
        UserEntity user = userRepo.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrderEntity order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        ReturnRequestEntity r = new ReturnRequestEntity();
        r.setUserId(user.getId());
        r.setOrderId(order.getId());
        r.setOrderItemIds(req.getOrderItemIds());
        r.setReason(req.getReason());
        r.setStatus("REQUESTED");
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(Instant.now());

        r = returnRepo.save(r);

        return ResponseEntity.status(201).body(Map.of("id", r.getId(), "status", r.getStatus()));
    }
}
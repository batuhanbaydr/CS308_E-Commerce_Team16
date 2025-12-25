package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.DeliveryItemDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.enums.OrderStatus;
import edu.sabanciuniv.cs308.backend.service.AdminOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/product/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PRODUCT_MANAGER')")
public class ProductManagerOrderController {

    private final AdminOrderService adminOrderService;

    // PM: invoice/order list view
    @GetMapping
    public ResponseEntity<List<OrderEntity>> list() {
        return ResponseEntity.ok(adminOrderService.getAllOrders());
    }

    // PM: delivery list (from orders)
    @GetMapping("/deliveries")
    public ResponseEntity<List<DeliveryItemDTO>> deliveries(
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(adminOrderService.getDeliveryList(status));
    }

    // PM: update order status
    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderEntity> updateStatus(
            @PathVariable String id,
            @RequestParam OrderStatus status
    ) {
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(id, status));
    }
}
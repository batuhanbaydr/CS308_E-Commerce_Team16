package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.enums.OrderStatus;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final OrderRepository orderRepository;

    public List<OrderEntity> getAllOrders() {
        return orderRepository.findAll();
    }

    public OrderEntity updateOrderStatus(String id, OrderStatus status) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        order.setStatus(status.name());
        return orderRepository.save(order);
    }
}
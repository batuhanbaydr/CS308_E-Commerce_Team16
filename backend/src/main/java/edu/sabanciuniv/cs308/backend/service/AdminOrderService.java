package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.DeliveryItemDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.enums.OrderStatus;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
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

    /**
     * Delivery list:
     * deliveryId, customerId, productId, quantity, totalPrice, deliveryAddress, completed
     */
    public List<DeliveryItemDTO> getDeliveryList(String statusFilter) {
        List<OrderEntity> orders;

        if (statusFilter != null && !statusFilter.isBlank()) {
            orders = orderRepository.findAll().stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().equalsIgnoreCase(statusFilter))
                    .toList();
        } else {
            orders = orderRepository.findAll();
        }

        List<DeliveryItemDTO> result = new ArrayList<>();

        for (OrderEntity o : orders) {
            if (o.getItems() == null) continue;

            boolean completed = o.getStatus() != null && o.getStatus().equalsIgnoreCase("DELIVERED");

            for (OrderItem item : o.getItems()) {
                DeliveryItemDTO dto = new DeliveryItemDTO();

                dto.setOrderId(o.getId());
                dto.setDeliveryId(o.getId() + ":" + (item.getSku() != null ? item.getSku() : item.getProductId()));

                dto.setCustomerId(o.getUserId());
                dto.setProductId(item.getProductId());
                dto.setSku(item.getSku());

                dto.setQuantity(item.getQuantity());

                BigDecimal total =
                        item.getLineTotal() != null
                                ? item.getLineTotal()
                                : (item.getUnitPrice() != null
                                ? item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                                : BigDecimal.ZERO);

                dto.setTotalPrice(total);

                dto.setDeliveryAddress(o.getShippingAddressSnapshot());
                dto.setCompleted(completed);
                dto.setOrderStatus(o.getStatus());

                result.add(dto);
            }
        }

        return result;
    }
}
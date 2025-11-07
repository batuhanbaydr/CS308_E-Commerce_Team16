package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.dto.OrderSummaryDTO;
import edu.sabanciuniv.cs308.backend.entity.AddressSnapshot;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;

import java.util.stream.Collectors;

public class OrderMapper {

    public static OrderSummaryDTO toSummary(OrderEntity e) {
        OrderSummaryDTO dto = new OrderSummaryDTO();
        dto.setId(e.getId());
        dto.setCreatedAt(e.getCreatedAt());
        dto.setStatus(e.getStatus());
        dto.setGrandTotal(e.getTotals() != null ? e.getTotals().getGrandTotal() : null);
        return dto;
    }

    public static OrderDetailDTO toDetail(OrderEntity e) {
        OrderDetailDTO dto = new OrderDetailDTO();
        dto.setId(e.getId());
        dto.setCreatedAt(e.getCreatedAt());
        dto.setStatus(e.getStatus());

        if (e.getItems() != null) {
            dto.setItems(e.getItems().stream().map(item -> {
                OrderDetailDTO.OrderItemDTO i = new OrderDetailDTO.OrderItemDTO();
                i.setProductId(item.getProductId());
                i.setSku(item.getSku());
                i.setName(item.getName());
                i.setQuantity(item.getQuantity());
                i.setUnitPrice(item.getUnitPrice());
                i.setLineTotal(item.getLineTotal());
                return i;
            }).collect(Collectors.toList()));
        }

        if (e.getTotals() != null) {
            OrderDetailDTO.MoneyDTO m = new OrderDetailDTO.MoneyDTO();
            m.setSubtotal(e.getTotals().getSubtotal());
            m.setTax(e.getTotals().getTax());
            m.setShipping(e.getTotals().getShipping());
            m.setGrandTotal(e.getTotals().getGrandTotal());
            dto.setTotals(m);
        }

        if (e.getShippingAddressSnapshot() != null) {
            dto.setShippingAddress(toAddressDTO(e.getShippingAddressSnapshot()));
        }
        if (e.getBillingAddressSnapshot() != null) {
            dto.setBillingAddress(toAddressDTO(e.getBillingAddressSnapshot()));
        }

        dto.setPaymentMethodRef(e.getPaymentMethodRef());

        return dto;
    }

    private static OrderDetailDTO.AddressDTO toAddressDTO(AddressSnapshot a) {
        OrderDetailDTO.AddressDTO d = new OrderDetailDTO.AddressDTO();
        d.setFullName(a.getFullName());
        d.setLine1(a.getLine1());
        d.setLine2(a.getLine2());
        d.setCity(a.getCity());
        d.setState(a.getState());
        d.setCountry(a.getCountry());
        d.setZipCode(a.getZipCode());
        d.setPhoneNumber(a.getPhoneNumber());
        return d;
    }
}
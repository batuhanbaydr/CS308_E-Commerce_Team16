package edu.sabanciuniv.cs308.backend.request;

import java.util.List;

public class NewReturnRequest {
    private String orderId;
    private List<String> orderItemIds;
    private String reason;

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public List<String> getOrderItemIds() { return orderItemIds; }
    public void setOrderItemIds(List<String> orderItemIds) { this.orderItemIds = orderItemIds; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
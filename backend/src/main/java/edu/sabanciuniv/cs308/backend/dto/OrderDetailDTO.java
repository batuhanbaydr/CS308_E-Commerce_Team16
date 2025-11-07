package edu.sabanciuniv.cs308.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class OrderDetailDTO {
    private String id;
    private Instant createdAt;
    private String status;
    private List<OrderItemDTO> items;
    private MoneyDTO totals;
    private AddressDTO shippingAddress;
    private AddressDTO billingAddress;
    private String paymentMethodRef;

    // getters & setters...

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<OrderItemDTO> getItems() { return items; }
    public void setItems(List<OrderItemDTO> items) { this.items = items; }

    public MoneyDTO getTotals() { return totals; }
    public void setTotals(MoneyDTO totals) { this.totals = totals; }

    public AddressDTO getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(AddressDTO shippingAddress) { this.shippingAddress = shippingAddress; }

    public AddressDTO getBillingAddress() { return billingAddress; }
    public void setBillingAddress(AddressDTO billingAddress) { this.billingAddress = billingAddress; }

    public String getPaymentMethodRef() { return paymentMethodRef; }
    public void setPaymentMethodRef(String paymentMethodRef) { this.paymentMethodRef = paymentMethodRef; }

    // -------------------------------------------------
    // inner DTOs
    // -------------------------------------------------

    public static class OrderItemDTO {
        private String productId;
        private String sku;
        private String name;
        private int quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
        // getters & setters...

        public String getProductId() { return productId; }
        public void setProductId(String productId) { this.productId = productId; }

        public String getSku() { return sku; }
        public void setSku(String sku) { this.sku = sku; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }

        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

        public BigDecimal getLineTotal() { return lineTotal; }
        public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
    }

    public static class MoneyDTO {
        private BigDecimal subtotal;
        private BigDecimal tax;
        private BigDecimal shipping;
        private BigDecimal grandTotal;
        // getters & setters...

        public BigDecimal getSubtotal() { return subtotal; }
        public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

        public BigDecimal getTax() { return tax; }
        public void setTax(BigDecimal tax) { this.tax = tax; }

        public BigDecimal getShipping() { return shipping; }
        public void setShipping(BigDecimal shipping) { this.shipping = shipping; }

        public BigDecimal getGrandTotal() { return grandTotal; }
        public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }
    }

    public static class AddressDTO {
        private String fullName;
        private String line1;
        private String line2;
        private String city;
        private String state;
        private String country;
        private String zipCode;
        private String phoneNumber;
        // getters & setters...

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getLine1() { return line1; }
        public void setLine1(String line1) { this.line1 = line1; }

        public String getLine2() { return line2; }
        public void setLine2(String line2) { this.line2 = line2; }

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }

        public String getState() { return state; }
        public void setState(String state) { this.state = state; }

        public String getCountry() { return country; }
        public void setCountry(String country) { this.country = country; }

        public String getZipCode() { return zipCode; }
        public void setZipCode(String zipCode) { this.zipCode = zipCode; }

        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    }
}
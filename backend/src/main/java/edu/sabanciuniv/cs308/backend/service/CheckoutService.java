package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.entity.AddressSnapshot;
import edu.sabanciuniv.cs308.backend.entity.Money;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.enums.OrderStatus;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.CheckoutRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
public class CheckoutService {

    
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final EmailService emailService;

    public CheckoutService(UserRepository userRepository,
                           OrderRepository orderRepository,
                           ProductRepository productRepository,
                            EmailService emailService) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.emailService = emailService;
    }


    @Transactional
    public OrderDetailDTO checkout(String userEmail, CheckoutRequest req) {

        // 1) Kullanıcıyı bul
        UserEntity user = userRepository.findByEmailAddress(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2) CART order'ı bul
        OrderEntity cart = findCartOrder(user, req.getCartId());
        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        // 3) SHIPPING address snapshot
        AddressSnapshot shipping = new AddressSnapshot();
        shipping.setFullName(req.getShippingFullName());
        shipping.setLine1(req.getShippingLine1());
        shipping.setLine2(req.getShippingLine2());
        shipping.setCity(req.getShippingCity());
        shipping.setState(req.getShippingState());
        shipping.setCountry(req.getShippingCountry());
        shipping.setZipCode(req.getShippingZipCode());
        shipping.setPhoneNumber(req.getShippingPhoneNumber());
        cart.setShippingAddressSnapshot(shipping);

        // 4) BILLING address snapshot
        AddressSnapshot billing;
        if (req.isUseShippingAsBilling()) {
            billing = shipping;
        } else {
            billing = new AddressSnapshot();
            billing.setFullName(req.getBillingFullName());
            billing.setLine1(req.getBillingLine1());
            billing.setLine2(req.getBillingLine2());
            billing.setCity(req.getBillingCity());
            billing.setState(req.getBillingState());
            billing.setCountry(req.getBillingCountry());
            billing.setZipCode(req.getBillingZipCode());
            billing.setPhoneNumber(req.getBillingPhoneNumber());
        }
        cart.setBillingAddressSnapshot(billing);

        // 5) Payment method referansı (sadece string)
        String paymentRef = String.format(
                "%s ****%s (%02d/%d)",
                req.getCardBrand(),
                req.getCardLast4(),
                req.getCardExpMonth(),
                req.getCardExpYear()
        );
        cart.setPaymentMethodRef(paymentRef);

        // 6** yeni ) Line item fiyatlarını (discount dahil) güncelle
        applyEffectivePricing(cart);


        // 6) Toplamları hesapla
        Money totals = computeTotals(cart);
        cart.setTotals(totals);

        // 7) Mock ödeme
        boolean paymentOk = mockCharge(paymentRef, totals.getGrandTotal());
        if (!paymentOk) {
            throw new RuntimeException("Payment failed");
        }

        // 8) ÖDEME BAŞARILIYSA → STOK DÜŞÜR
        decreaseStock(cart);

        // 9) CART → PROCESSING
        cart.setStatus(OrderStatus.PROCESSING.name());
        if (cart.getCreatedAt() == null) {
            cart.setCreatedAt(Instant.now());
        }

        OrderEntity saved = orderRepository.save(cart);
        OrderDetailDTO dto = OrderMapper.toDetail(saved);

        emailService.sendOrderConfirmation(user, dto);

        // 10) Sipariş detayını döndür
        return dto;
    }

    // --------------------------------------------------------
    // Helper metodlar
    // --------------------------------------------------------
    private void applyEffectivePricing(OrderEntity cart) {
        Instant now = Instant.now();

        cart.getItems().forEach(item -> {
            ProductEntity product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

            BigDecimal unit = ProductPricing.effectiveUnitPrice(product, item.getSku(), now);
            if (unit == null) unit = BigDecimal.ZERO;

            item.setUnitPrice(unit);
            item.setLineTotal(unit.multiply(BigDecimal.valueOf(item.getQuantity())));
        });
    }

    private OrderEntity findCartOrder(UserEntity user, String cartId) {
        OrderEntity cart;

        if (cartId != null && !cartId.isBlank()) {
            cart = orderRepository.findById(cartId)
                    .orElseThrow(() -> new RuntimeException("Cart not found"));

            if (!OrderStatus.CART.name().equals(cart.getStatus())) {
                throw new RuntimeException("Order is not in CART status");
            }

            // Guest sepetini login user'a bağla
            if (cart.getUserId() == null) {
                cart.setUserId(user.getId());
            } else if (!cart.getUserId().equals(user.getId())) {
                throw new RuntimeException("Cart belongs to another user");
            }
        } else {
            cart = orderRepository.findByUserIdAndStatus(
                    user.getId(), OrderStatus.CART.name());
            if (cart == null) {
                throw new RuntimeException("No active cart for user");
            }
        }
        return cart;
    }

    private Money computeTotals(OrderEntity order) {
        BigDecimal subtotal = order.getItems().stream()
                .map(i -> i.getLineTotal() != null ? i.getLineTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal tax = subtotal.multiply(new BigDecimal("0.20")); // %20 KDV mock
        BigDecimal shipping = BigDecimal.ZERO;                      // şimdilik ücretsiz kargo
        BigDecimal grand = subtotal.add(tax).add(shipping);

        Money money = new Money();
        money.setSubtotal(subtotal);
        money.setTax(tax);
        money.setShipping(shipping);
        money.setGrandTotal(grand);
        return money;
    }

    private boolean mockCharge(String paymentRef, BigDecimal amount) {
        System.out.println("Mock charging " + paymentRef + " amount=" + amount);
        return true;
    }

    // ÖDEME BAŞARILI OLDUKTAN SONRA STOK DÜŞÜR
    private void decreaseStock(OrderEntity cart) {
        cart.getItems().forEach(item -> {
            ProductEntity product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

            ProductEntity.Variant variant = product.getVariants().stream()
                    .filter(v -> v.getSku().equals(item.getSku()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Variant not found: " + item.getSku()));

            int currentStock = variant.getStock();
            int quantity = item.getQuantity();

            if (currentStock < quantity) {
                // Normalde buraya gelmemeliyiz, çünkü BasketService stok kontrolü yapıyor.
                throw new RuntimeException("Insufficient stock during checkout");
            }

            variant.setStock(currentStock - quantity);
            productRepository.save(product);
        });
    }

}

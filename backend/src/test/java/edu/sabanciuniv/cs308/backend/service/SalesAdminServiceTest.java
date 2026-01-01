package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.ApplyDiscountRequest;
import edu.sabanciuniv.cs308.backend.dto.SalesAdminDTO;
import edu.sabanciuniv.cs308.backend.entity.Money;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesAdminServiceTest {

    @Mock ProductRepository productRepository;
    @Mock WishlistRepository wishlistRepository;
    @Mock UserRepository userRepository;
    @Mock OrderRepository orderRepository;
    @Mock EmailService emailService;

    @InjectMocks SalesAdminService salesAdminService;

    // ------------------------------------------------
    // TEST 1 — applyDiscount: boş productIds → (0,0)
    // ------------------------------------------------
    @Test
    void applyDiscount_shouldReturnZero_whenProductIdsEmpty() {
        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setProductIds(List.of());
        req.setDiscountRate(0.15);

        SalesAdminDTO.DiscountResult res = salesAdminService.applyDiscount(req);

        assertThat(res.getUpdatedProducts()).isEqualTo(0);
        assertThat(res.getNotifiedUsers()).isEqualTo(0);

        verifyNoInteractions(productRepository, wishlistRepository, userRepository, orderRepository, emailService);
    }

    // ------------------------------------------------
    // TEST 2 — applyDiscount: invalid discountRate
    // ------------------------------------------------
    @Test
    void applyDiscount_shouldThrow_whenRateInvalid() {
        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setProductIds(List.of("p1"));
        req.setDiscountRate(1.0); // invalid

        assertThatThrownBy(() -> salesAdminService.applyDiscount(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("discountRate must be between");

        verifyNoInteractions(productRepository, wishlistRepository, userRepository, orderRepository, emailService);
    }

    // ------------------------------------------------
    // TEST 3 — applyDiscount: fiyatlar güncellenir, saveAll çağrılır
    // notifyWishlist=false → mail yok
    // ------------------------------------------------
    @Test
    void applyDiscount_shouldUpdatePrices_andSaveAll_whenNotifyFalse() {
        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setProductIds(List.of("p1"));
        req.setDiscountRate(0.10);
        req.setNotifyWishlist(false);

        ProductEntity p = new ProductEntity();
        p.setId("p1");
        p.setBasePrice(new BigDecimal("100.00"));

        ProductEntity.Variant v = new ProductEntity.Variant();
        v.setSku("SKU-1");
        v.setPrice(new BigDecimal("50.00"));
        p.setVariants(List.of(v));

        when(productRepository.findAllById(List.of("p1"))).thenReturn(List.of(p));

        SalesAdminDTO.DiscountResult res = salesAdminService.applyDiscount(req);

        assertThat(p.getBasePrice()).isEqualByComparingTo("90.00");
        assertThat(p.getVariants().get(0).getPrice()).isEqualByComparingTo("45.00");

        verify(productRepository, times(1)).saveAll(anyList());
        verifyNoInteractions(emailService);

        assertThat(res.getUpdatedProducts()).isEqualTo(1);
        assertThat(res.getNotifiedUsers()).isEqualTo(0);
    }

    // ------------------------------------------------
    // TEST 4 — applyDiscount: notifyWishlist=true → mail atılır
    // ------------------------------------------------
    @Test
    void applyDiscount_shouldSendEmail_whenNotifyTrue() {
        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setProductIds(List.of("p1"));
        req.setDiscountRate(0.20);
        req.setNotifyWishlist(true);

        ProductEntity p = new ProductEntity();
        p.setId("p1");
        p.setBasePrice(new BigDecimal("100.00"));
        when(productRepository.findAllById(List.of("p1"))).thenReturn(List.of(p));

        WishlistEntity w = new WishlistEntity();
        w.setUserId("u1");               // IMPORTANT: userId (id, email değil)
        w.setProductIds(Set.of("p1"));
        when(wishlistRepository.findAllByProductIdsContaining("p1")).thenReturn(List.of(w));

        UserEntity u1 = new UserEntity();
        u1.setId("u1");
        u1.setEmailAddress("u1@mail.com");
        when(userRepository.findById("u1")).thenReturn(Optional.of(u1));

        SalesAdminDTO.DiscountResult res = salesAdminService.applyDiscount(req);

        verify(emailService, times(1)).sendDiscountNotification(eq(u1), eq(p), eq(0.20));
        assertThat(res.getNotifiedUsers()).isEqualTo(1);
    }

    // ------------------------------------------------
    // TEST 5 — revenueProfit: revenue / cost / profit doğru
    // ------------------------------------------------
    @Test
    void revenueProfit_shouldComputeRevenueCostProfit() {
        Instant start = Instant.parse("2025-12-01T00:00:00Z");
        Instant end   = Instant.parse("2025-12-31T23:59:59Z");

        OrderEntity o1 = order("o1", "PLACED",
                Instant.parse("2025-12-10T10:00:00Z"),
                List.of(item("p1", 2, "10.00")),
                "20.00");

        OrderEntity o2 = order("o2", "DELIVERED",
                Instant.parse("2025-12-10T12:00:00Z"),
                List.of(item("p2", 1, "40.00")),
                "40.00");

        when(orderRepository.findByStatusInAndCreatedAtBetween(
                eq(List.of("PLACED", "SHIPPED", "DELIVERED")),
                eq(start),
                eq(end)
        )).thenReturn(List.of(o1, o2));

        SalesAdminDTO.RevenueProfitSummary summary =
                salesAdminService.revenueProfit(start, end, "day");

        assertThat(summary.getRevenue()).isEqualByComparingTo("60.00");
        assertThat(summary.getCost()).isEqualByComparingTo("30.00");
        assertThat(summary.getProfit()).isEqualByComparingTo("30.00");

        assertThat(summary.getSeries()).isNotEmpty();
    }

    // ---------------- helpers ----------------

    private OrderItem item(String productId, int qty, String unitPrice) {
        OrderItem it = new OrderItem();
        it.setProductId(productId);
        it.setSku("SKU-" + productId);
        it.setName("Item-" + productId);
        it.setQuantity(qty);
        it.setUnitPrice(new BigDecimal(unitPrice));
        it.setLineTotal(null); // service hesaplasın
        return it;
    }

    private OrderEntity order(String id, String status, Instant createdAt,
                              List<OrderItem> items, String grandTotal) {
        OrderEntity o = new OrderEntity();
        o.setId(id);
        o.setStatus(status);
        o.setCreatedAt(createdAt);
        o.setItems(new ArrayList<>(items));

        Money m = new Money();
        m.setGrandTotal(new BigDecimal(grandTotal));
        o.setTotals(m);

        return o;
    }
}

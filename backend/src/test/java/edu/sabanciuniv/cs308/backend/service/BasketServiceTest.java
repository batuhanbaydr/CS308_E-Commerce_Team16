package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.BasketDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.request.AddToBasketRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BasketServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private BasketService basketService;

    private ProductEntity product;

    @BeforeEach
    void setup() {
        ProductEntity.Variant variant = new ProductEntity.Variant();
        variant.setSku("SKU-RED-M");
        variant.setSize("M");
        variant.setColor("Red");
        variant.setStock(10);
        variant.setPrice(new BigDecimal("100"));

        product = new ProductEntity();
        product.setId("P1");
        product.setName("Dress");
        product.setBasePrice(new BigDecimal("80"));
        product.setVariants(List.of(variant));
    }

    // ---------------------------------------------------------
    // TEST 1 — Guest basket creation
    // ---------------------------------------------------------
    @Test
    void addItem_shouldCreateCart_forGuestUser() {
        // GIVEN
        when(productRepository.findById("P1")).thenReturn(Optional.of(product));

        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(i -> {
            OrderEntity saved = i.getArgument(0);
            saved.setId("CART-123");
            return saved;
        });

        AddToBasketRequest req = new AddToBasketRequest();
        req.setProductId("P1");
        req.setSku("SKU-RED-M");
        req.setQuantity(2);

        // WHEN
        BasketDTO dto = basketService.addItem(null, null, req);

        // THEN
        assertThat(dto.getOrderId()).isEqualTo("CART-123");
        assertThat(dto.getItems()).hasSize(1);
        assertThat(dto.getSubtotal()).isEqualByComparingTo("200");
    }

    // ---------------------------------------------------------
    // TEST 2 — Quantity increases on repeated addItem
    // ---------------------------------------------------------
    @Test
    void addItem_shouldIncreaseQuantity_whenItemAlreadyExists() {
        // GIVEN
        OrderItem existing = new OrderItem();
        existing.setProductId("P1");
        existing.setSku("SKU-RED-M");
        existing.setQuantity(1);
        existing.setUnitPrice(new BigDecimal("100"));
        existing.setLineTotal(new BigDecimal("100"));

        OrderEntity cart = new OrderEntity();
        cart.setId("CART-1");
        cart.setStatus("CART");
        cart.setItems(List.of(existing));

        when(orderRepository.findById("CART-1")).thenReturn(Optional.of(cart));
        when(productRepository.findById("P1")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenReturn(cart);

        AddToBasketRequest req = new AddToBasketRequest();
        req.setProductId("P1");
        req.setSku("SKU-RED-M");
        req.setQuantity(2);

        // WHEN
        BasketDTO dto = basketService.addItem(null, "CART-1", req);

        // THEN
        assertThat(dto.getItems().get(0).getQuantity()).isEqualTo(3);
        assertThat(dto.getItems().get(0).getLineTotal()).isEqualByComparingTo("300");
    }

    // ---------------------------------------------------------
    // TEST 3 — Stock insufficient
    // ---------------------------------------------------------
    @Test
    void addItem_shouldThrow_whenStockInsufficient() {
        // arrange
        String cartId = "C-1";

        // Boş ama mevcut bir CART
        OrderEntity cart = new OrderEntity();
        cart.setId(cartId);
        cart.setStatus("CART");
        cart.setItems(new ArrayList<>());

        // Ürün ve varyant
        ProductEntity product = new ProductEntity();
        product.setId("P-1");
        product.setBasePrice(new BigDecimal("100"));

        ProductEntity.Variant variant = new ProductEntity.Variant();
        variant.setSku("SKU-1");
        variant.setStock(1);                    // sadece 1 adet stok
        variant.setPrice(new BigDecimal("100"));

        product.setVariants(List.of(variant));

        // Stublar
        when(orderRepository.findById(cartId)).thenReturn(Optional.of(cart));
        when(productRepository.findById("P-1")).thenReturn(Optional.of(product));

        AddToBasketRequest req = new AddToBasketRequest();
        req.setProductId("P-1");
        req.setSku("SKU-1");
        req.setQuantity(5);                     // 5 adet istiyor → stok yetersiz

        // act + assert
        assertThatThrownBy(() ->
                basketService.addItem(null, cartId, req)
        )
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Not enough stock");
    }

    // ---------------------------------------------------------
    // TEST 4 — getBasket returns empty DTO when nothing exists
    // ---------------------------------------------------------
    @Test
    void getBasket_shouldReturnEmpty_whenCartNotFound() {
        // arrange
        String userId = "U-404";
        String cartId = "C-404";

        // Hem cartId hem userId için sonuç yok
        when(orderRepository.findById(cartId)).thenReturn(Optional.empty());
        when(orderRepository.findByUserIdAndStatus(userId, "CART")).thenReturn(null);

        // act
        BasketDTO dto = basketService.getBasket(userId, cartId);

        // assert
        assertThat(dto.getOrderId()).isNull();
        assertThat(dto.getItems()).isEmpty();
        assertThat(dto.getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ---------------------------------------------------------
    // TEST 5 — attachCartToUser merges correctly
    // ---------------------------------------------------------
    @Test
    void attachCartToUser_shouldMergeGuestCartIntoUserCart() {
        // guest cart
        OrderItem guestItem = new OrderItem();
        guestItem.setProductId("P1");
        guestItem.setSku("SKU-RED-M");
        guestItem.setQuantity(2);
        guestItem.setUnitPrice(new BigDecimal("100"));
        guestItem.setLineTotal(new BigDecimal("200"));

        OrderEntity guestCart = new OrderEntity();
        guestCart.setId("G-1");
        guestCart.setStatus("CART");
        guestCart.setItems(List.of(guestItem));

        // user has existing cart
        OrderItem userItem = new OrderItem();
        userItem.setProductId("P1");
        userItem.setSku("SKU-RED-M");
        userItem.setQuantity(1);
        userItem.setUnitPrice(new BigDecimal("100"));
        userItem.setLineTotal(new BigDecimal("100"));

        OrderEntity userCart = new OrderEntity();
        userCart.setId("U-1");
        userCart.setStatus("CART");
        userCart.setUserId("USER");
        userCart.setItems(List.of(userItem));

        when(orderRepository.findById("G-1")).thenReturn(Optional.of(guestCart));
        when(orderRepository.findByUserIdAndStatus("USER", "CART")).thenReturn(userCart);
        when(productRepository.findById("P1")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenReturn(userCart);

        BasketDTO dto = basketService.attachCartToUser("USER", "G-1");

        assertThat(dto.getItems().get(0).getQuantity()).isEqualTo(3); // merged
        verify(orderRepository).deleteById("G-1"); // guest cart deleted
    }
}
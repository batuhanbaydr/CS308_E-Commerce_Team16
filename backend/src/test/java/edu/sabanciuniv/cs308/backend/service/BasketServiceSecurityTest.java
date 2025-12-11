package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.BasketDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.request.AddToBasketRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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

/**
 * Bu testler BasketService'in "güvenlik" ve "edge-case" davranışlarını test ediyor:
 *  - cartId başka bir kullanıcıya aitse user'ın kendi sepetini kullanma
 *  - getBasket'te cartId + userId çakışmasında doğru sepeti seçme
 *  - attachCartToUser'da başka kullanıcıya ait cart'ı reddetme
 *  - boş guest cart attach edilince gereksiz DB işlemi yapılmaması
 *
 * Var olan basit testlerle çakışmıyor, farklı senaryolara odaklanıyor.
 */
@ExtendWith(MockitoExtension.class)
class BasketServiceSecurityTest {

    @Mock
    OrderRepository orderRepository;

    @Mock
    ProductRepository productRepository;

    @InjectMocks
    BasketService basketService;

    // küçük helper: CART oluştur
    private OrderEntity cart(String id, String userId) {
        OrderEntity o = new OrderEntity();
        o.setId(id);
        o.setUserId(userId);
        o.setStatus("CART");
        o.setCreatedAt(Instant.now());
        o.setItems(new ArrayList<>());
        return o;
    }

    private ProductEntity productWithVariant(String productId, String sku, int stock, BigDecimal price) {
        ProductEntity.Variant v = new ProductEntity.Variant();
        v.setSku(sku);
        v.setStock(stock);
        v.setPrice(price);

        ProductEntity p = new ProductEntity();
        p.setId(productId);
        p.setName("Test Product");
        p.setBasePrice(price);
        p.setVariants(List.of(v));
        return p;
    }

    // -------------------------------------------------------------------
    // TEST 1 — getBasket: cartId başka kullanıcıya aitse, user'ın CART'ı kullanılmalı
    // -------------------------------------------------------------------
    @Test
    void getBasket_shouldIgnoreForeignCartId_andUseUsersOwnCart() {
        String userId = "USER-1";

        // cartId ile gelen sepet başka kullanıcıya ait
        OrderEntity foreignCart = cart("C-FOREIGN", "USER-2");

        // user'ın kendi sepeti
        OrderEntity userCart = cart("C-MINE", userId);

        when(orderRepository.findById("C-FOREIGN")).thenReturn(Optional.of(foreignCart));
        when(orderRepository.findByUserIdAndStatus(userId, "CART")).thenReturn(userCart);

        // act
        BasketDTO dto = basketService.getBasket(userId, "C-FOREIGN");

        // assert: orderId olarak user'ın CART'ı gelmeli
        assertThat(dto.getOrderId()).isEqualTo("C-MINE");

        // ve foreign cart üzerinde hiçbir değişiklik yapılmamalı
        verify(orderRepository, never()).save(foreignCart);
    }

    // -------------------------------------------------------------------
    // TEST 2 — addItem: cartId başka kullanıcıya aitse, getOrCreateCart user'ın sepetini kullanmalı
    // -------------------------------------------------------------------
    @Test
    void addItem_shouldIgnoreForeignCartId_andAddToUsersCart() {
        String userId = "USER-1";

        // cartId ile verilen sepet başka user'a ait
        OrderEntity foreignCart = cart("C-FOREIGN", "USER-2");

        // user'ın kendi sepeti (başlangıçta boş)
        OrderEntity userCart = cart("C-MINE", userId);

        when(orderRepository.findById("C-FOREIGN")).thenReturn(Optional.of(foreignCart));
        when(orderRepository.findByUserIdAndStatus(userId, "CART")).thenReturn(userCart);

        // Ürün + stok
        ProductEntity product = productWithVariant("P-1", "SKU-1", 10, new BigDecimal("50"));
        when(productRepository.findById("P-1")).thenReturn(Optional.of(product));

        // orderRepository.save çağrısını yakalamak için captor
        ArgumentCaptor<OrderEntity> savedCaptor = ArgumentCaptor.forClass(OrderEntity.class);
        when(orderRepository.save(savedCaptor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        AddToBasketRequest req = new AddToBasketRequest();
        req.setProductId("P-1");
        req.setSku("SKU-1");
        req.setQuantity(2);

        // act
        BasketDTO dto = basketService.addItem(userId, "C-FOREIGN", req);

        // assert: item userCart'a eklenmiş olmalı, foreignCart'a değil
        OrderEntity saved = savedCaptor.getValue();
        assertThat(saved.getId()).isEqualTo("C-MINE");
        assertThat(dto.getOrderId()).isEqualTo("C-MINE");
        assertThat(saved.getItems()).hasSize(1);
        assertThat(saved.getItems().get(0).getProductId()).isEqualTo("P-1");

        // foreign cart üzerinde save çağrısı olmamalı
        verify(orderRepository, times(1)).save(userCart);
        verify(orderRepository, never()).save(foreignCart);
    }

    // -------------------------------------------------------------------
    // TEST 3 — attachCartToUser: guestCart zaten başka user'a aitse BAD_REQUEST
    // -------------------------------------------------------------------
    @Test
    void attachCartToUser_shouldThrow_whenGuestCartBelongsToAnotherUser() {
        String currentUserId = "USER-1";

        OrderEntity guestCart = cart("G-1", "SOME-OTHER-USER"); // zaten bir user'a bağlı

        when(orderRepository.findById("G-1")).thenReturn(Optional.of(guestCart));

        assertThatThrownBy(() ->
                basketService.attachCartToUser(currentUserId, "G-1")
        )
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cart belongs to another user");

        // merge vs. hiçbir işlem yapılmamalı
        verify(orderRepository, never()).deleteById(anyString());
        verify(orderRepository, never()).save(any(OrderEntity.class));
    }

    // -------------------------------------------------------------------
    // TEST 4 — attachCartToUser: guestCart boşsa, userCart varsa direkt userCart dönmeli
    // -------------------------------------------------------------------
    @Test
    void attachCartToUser_shouldReturnExistingUserCart_whenGuestCartIsEmpty() {
        String userId = "USER-1";

        // Boş guest sepet
        OrderEntity guestCart = cart("G-EMPTY", null);
        guestCart.setItems(new ArrayList<>()); // explicit empty

        // Kullanıcının dolu sepeti
        OrderEntity userCart = cart("C-USER", userId);
        OrderItem item = new OrderItem();
        item.setProductId("P-1");
        item.setSku("SKU-1");
        item.setName("Existing");
        item.setQuantity(1);
        item.setUnitPrice(new BigDecimal("100"));
        item.setLineTotal(new BigDecimal("100"));
        userCart.setItems(new ArrayList<>(List.of(item)));

        when(orderRepository.findById("G-EMPTY")).thenReturn(Optional.of(guestCart));
        when(orderRepository.findByUserIdAndStatus(userId, "CART")).thenReturn(userCart);

        // act
        BasketDTO dto = basketService.attachCartToUser(userId, "G-EMPTY");

        // assert
        assertThat(dto.getOrderId()).isEqualTo("C-USER");
        assertThat(dto.getItems()).hasSize(1);
        assertThat(dto.getItems().get(0).getProductId()).isEqualTo("P-1");

        // Boş guestCart için deleteById veya save çağrılmamalı
        verify(orderRepository, never()).deleteById("G-EMPTY");
        verify(orderRepository, never()).save(any(OrderEntity.class));
    }
}

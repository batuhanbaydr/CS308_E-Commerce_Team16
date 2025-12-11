package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.BasketDTO;
import edu.sabanciuniv.cs308.backend.dto.BasketItemDTO;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.service.BasketService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BasketController.class)
@AutoConfigureMockMvc(addFilters = false) // disable security filters for this test
class BasketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BasketService basketService;

    @MockBean
    private UserRepository userRepository;

    // small helper: empty basket DTO with given id
    private BasketDTO emptyBasket(String orderId) {
        BasketDTO dto = new BasketDTO();
        dto.setOrderId(orderId);
        dto.setItems(List.of());
        dto.setSubtotal(BigDecimal.ZERO);
        return dto;
    }

    @Test
    void getBasket_guest_shouldUseCartIdOnly() throws Exception {
        // arrange
        BasketDTO dto = emptyBasket("C-1");
        when(basketService.getBasket(null, "C-1")).thenReturn(dto);

        // act + assert
        mockMvc.perform(get("/api/basket")
                        .param("cartId", "C-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("C-1"));

        // verify
        verify(basketService).getBasket(null, "C-1");
    }

    @Test
    void addItem_shouldReturnBasketFromService() throws Exception {
        // arrange
        BasketDTO dto = emptyBasket("C-2");

        BasketItemDTO item = new BasketItemDTO();
        item.setProductId("P-1");
        item.setSku("SKU-1");
        item.setName("Soft Hoodie");
        item.setQuantity(2);
        item.setUnitPrice(new BigDecimal("60.00"));
        item.setLineTotal(new BigDecimal("120.00"));
        dto.setItems(List.of(item));
        dto.setSubtotal(new BigDecimal("120.00"));

        when(basketService.addItem(isNull(), eq("C-2"), any()))
                .thenReturn(dto);

        String requestBody = """
                {
                  "productId": "P-1",
                  "sku": "SKU-1",
                  "quantity": 2
                }
                """;

        // act + assert
        mockMvc.perform(post("/api/basket/items")
                        .param("cartId", "C-2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("C-2"))
                .andExpect(jsonPath("$.items[0].productId").value("P-1"))
                .andExpect(jsonPath("$.subtotal").value(120.00));

        verify(basketService).addItem(isNull(), eq("C-2"), any());
    }

    @Test
    void removeItem_shouldCallServiceAndReturnUpdatedBasket() throws Exception {
        // arrange
        BasketDTO dto = emptyBasket("C-3");
        when(basketService.removeItem(isNull(), eq("C-3"), eq("P-1"), eq("SKU-1")))
                .thenReturn(dto);

        // act + assert
        mockMvc.perform(delete("/api/basket/items/{productId}/{sku}", "P-1", "SKU-1")
                        .param("cartId", "C-3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("C-3"));

        verify(basketService).removeItem(isNull(), eq("C-3"), eq("P-1"), eq("SKU-1"));
    }

    @Test
    void attachCart_shouldResolveUserFromAuthentication_andCallService() throws Exception {
        // --- arrange: put fake auth into SecurityContext ---
        Authentication auth =
                new UsernamePasswordAuthenticationToken("user@example.com", "pw");
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);

        // userRepository returns a user for that email
        UserEntity user = new UserEntity();
        user.setId("U-1");
        user.setEmailAddress("user@example.com");

        when(userRepository.findByEmailAddress("user@example.com"))
                .thenReturn(Optional.of(user));

        // basketService attaches and returns basket
        BasketDTO dto = emptyBasket("C-4");
        when(basketService.attachCartToUser("U-1", "C-4"))
                .thenReturn(dto);

        // --- act + assert ---
        mockMvc.perform(post("/api/basket/attach")
                        .param("cartId", "C-4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("C-4"));

        // --- verify ---
        verify(userRepository).findByEmailAddress("user@example.com");
        verify(basketService).attachCartToUser("U-1", "C-4");

        SecurityContextHolder.clearContext();
    }
}
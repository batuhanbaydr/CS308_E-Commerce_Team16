package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.*;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerContextService {

    private final UserRepository userRepository;
    private final BasketService basketService;
    private final OrderRepository orderRepository;
    private final WishlistService wishlistService;

    public CustomerContextService(UserRepository userRepository,
                                  BasketService basketService,
                                  OrderRepository orderRepository,
                                  WishlistService wishlistService) {
        this.userRepository = userRepository;
        this.basketService = basketService;
        this.orderRepository = orderRepository;
        this.wishlistService = wishlistService;
    }

    /**
     * userId: cart/orders için (OrderEntity.userId gerçek id)
     * userEmail: wishlist için (WishlistEntity.userId = email)
     */
    public CustomerContextResponse buildContext(String userId, String userEmail) {
        CustomerContextResponse ctx = new CustomerContextResponse();

        if ((userId == null || userId.isBlank()) && (userEmail == null || userEmail.isBlank())) {
            ctx.setLoggedIn(false);
            return ctx;
        }

        ctx.setLoggedIn(true);

        // 1) User profilini email > id önceliğiyle bul (email varsa daha sağlam)
        UserEntity user = null;
        if (userEmail != null && !userEmail.isBlank()) {
            user = userRepository.findByEmailAddress(userEmail).orElse(null);
            if (user != null && (userId == null || userId.isBlank())) {
                userId = user.getId(); // cart/orders için id’yi tamamla
            }
        } else if (userId != null && !userId.isBlank()) {
            user = userRepository.findById(userId).orElse(null);
            if (user != null && (userEmail == null || userEmail.isBlank())) {
                userEmail = user.getEmailAddress(); // wishlist için email’i tamamla
            }
        }

        if (user != null) {
            UserDTO dto = new UserDTO();
            dto.setId(user.getId());
            dto.setName(user.getName());
            dto.setEmailAddress(user.getEmailAddress());
            dto.setHomeAddress(user.getHomeAddress());
            dto.setRole(user.getRole() != null ? user.getRole().name() : null);
            dto.setPhoneNumber(user.getPhoneNumber());
            dto.setAddresses(user.getAddresses());
            ctx.setUser(dto);
        }

        // 2) Cart (userId ile)
        if (userId != null && !userId.isBlank()) {
            BasketDTO basket = basketService.getBasket(userId, null);
            ctx.setCart(basket);
        } else {
            ctx.setCart(null);
        }

        // 3) Recent orders (CART hariç, userId ile)
        if (userId != null && !userId.isBlank()) {
            List<OrderSummaryDTO> orders = orderRepository
                    .findTop5ByUserIdAndStatusNotOrderByCreatedAtDesc(userId, "CART")
                    .stream()
                    .map(OrderMapper::toSummary)
                    .toList();

            // CustomerContextResponse.orders List<Object> olduğu için cast
            ctx.setOrders((List) orders);
        } else {
            ctx.setOrders(List.of());
        }

        // 4) Wishlist (email ile; çünkü DB’de email saklı)
        if (userEmail != null && !userEmail.isBlank()) {
            WishlistResponseDTO wishlist = wishlistService.getWishlist(userEmail);
            ctx.setWishlist(List.of(wishlist));
        } else {
            ctx.setWishlist(List.of());
        }

        return ctx;
    }

    // (İstersen geriye dönük uyumluluk için bunu da bırakabilirsin)
    public CustomerContextResponse buildContextByUserId(String userId) {
        return buildContext(userId, null);
    }
}

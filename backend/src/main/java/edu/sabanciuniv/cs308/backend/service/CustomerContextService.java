package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.UserDTO;
import edu.sabanciuniv.cs308.backend.dto.CustomerContextResponse;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerContextService {

    private final UserRepository userRepository;

    public CustomerContextService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public CustomerContextResponse buildContextByUserId(String userId) {
        CustomerContextResponse ctx = new CustomerContextResponse();

        if (userId == null) {
            ctx.setLoggedIn(false);
            return ctx;
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmailAddress(user.getEmailAddress());
        dto.setHomeAddress(user.getHomeAddress());
        dto.setRole(user.getRole() != null ? user.getRole().name() : null);
        dto.setPhoneNumber(user.getPhoneNumber());

        ctx.setLoggedIn(true);
        ctx.setUser(dto);

        // TODO: Projende cart/order/wishlist servisleri varsa buraya bağlayacağız
        ctx.setCart(null);
        ctx.setOrders(List.of());
        ctx.setWishlist(List.of());

        return ctx;
    }
}
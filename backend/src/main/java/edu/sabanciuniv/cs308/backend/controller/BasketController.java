package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.BasketDTO;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.AddToBasketRequest;
import edu.sabanciuniv.cs308.backend.request.UpdateBasketItemRequest;
import edu.sabanciuniv.cs308.backend.service.BasketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/basket")
public class BasketController {

    private final BasketService basketService;
    private final UserRepository userRepository;    

    public BasketController(BasketService basketService,
                            UserRepository userRepository) {
        this.basketService = basketService;
        this.userRepository = userRepository;
    }

    /**
     * Sepeti getir.
     * - Guest senaryosu: sadece cartId ile çağrılır -> /api/basket?cartId=...
     * - Login'li senaryo: sadece userId ile çağrılabilir -> /api/basket?userId=...
     * (ikisi birden gelirse cartId öncelikli)
     */
    @GetMapping
    public ResponseEntity<BasketDTO> getBasket(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String cartId
    ) {
        BasketDTO dto = basketService.getBasket(userId, cartId);
        return ResponseEntity.ok(dto);
    }

    /**
     * Sepete ürün ekle.
     * - İlk kez guest ise: hiçbir şey vermez -> backend yeni CART yaratır, DTO içinde orderId döner.
     * - Sonraki isteklerde: cartId ile gelir.
     * - Login'li kullanıcıda: userId parametresi de verilebilir (ileride merge/checkout'ta kullanılır).
     */
    @PostMapping("/items")
    public ResponseEntity<BasketDTO> addItem(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String cartId,
            @RequestBody AddToBasketRequest request
    ) {
        BasketDTO dto = basketService.addItem(userId, cartId, request);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/items")
    public ResponseEntity<BasketDTO> updateItem(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String cartId,
            @RequestBody UpdateBasketItemRequest request
    ) {
        BasketDTO dto = basketService.updateItem(userId, cartId, request);
        return ResponseEntity.ok(dto);
    }

    /**
     * Guest sepetini login olmuş kullanıcıya bağlar (cart persistence).
     * Kullanım:
     *  - Kullanıcı login olduktan sonra frontend:
     *      POST /api/basket/attach?cartId=...
     *    çağırır.
     *  - Kullanıcı bilgisi session'dan (Authentication) alınır.
     */
    @PostMapping("/attach")
    public ResponseEntity<BasketDTO> attachCart(
            Authentication auth,
            @RequestParam String cartId
    ) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User must be logged in to attach cart"
            );
        }

        String email = auth.getName(); // username = email
        UserEntity user = userRepository.findByEmailAddress(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        BasketDTO dto = basketService.attachCartToUser(user.getId(), cartId);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/items/{productId}/{sku}")
    public ResponseEntity<BasketDTO> removeItem(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String cartId,
            @PathVariable String productId,
            @PathVariable String sku
    ) {
        BasketDTO dto = basketService.removeItem(userId, cartId, productId, sku);
        return ResponseEntity.ok(dto);
    }
}
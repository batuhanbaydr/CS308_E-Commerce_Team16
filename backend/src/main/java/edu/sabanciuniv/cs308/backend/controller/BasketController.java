package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.BasketDTO;
import edu.sabanciuniv.cs308.backend.request.AddToBasketRequest;
import edu.sabanciuniv.cs308.backend.request.UpdateBasketItemRequest;
import edu.sabanciuniv.cs308.backend.service.BasketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/basket")
public class BasketController {

    private final BasketService basketService;

    public BasketController(BasketService basketService) {
        this.basketService = basketService;
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
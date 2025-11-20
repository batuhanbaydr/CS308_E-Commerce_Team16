package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.BasketDTO;
import edu.sabanciuniv.cs308.backend.dto.BasketItemDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.request.AddToBasketRequest;
import edu.sabanciuniv.cs308.backend.request.UpdateBasketItemRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BasketService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    /**
     * Sepeti şu öncelik sırasına göre bulur/oluşturur:
     * 1) cartId verilmişse -> o CART order'ı bul
     * 2) cartId yok ama userId verilmişse -> user'ın CART order'ını bul
     * 3) hiçbiri yoksa -> yeni guest CART order yarat
     */
    private OrderEntity getOrCreateCart(String userId, String cartId) {

        // 1) cartId öncelikli (guest veya user fark etmez)
        if (cartId != null && !cartId.isBlank()) {
            Optional<OrderEntity> byId = orderRepository.findById(cartId);
            if (byId.isPresent() && "CART".equals(byId.get().getStatus())) {
                return byId.get();
            }
            // cartId geçersizse: yeni oluşturacağız
        }

        // 2) userId varsa ve daha önce CART oluşturduysa onu kullan
        if (userId != null && !userId.isBlank()) {
            OrderEntity existing = orderRepository.findByUserIdAndStatus(userId, "CART");
            if (existing != null) {
                return existing;
            }
        }

        // 3) yeni CART oluştur (guest ise userId = null olabilir)
        OrderEntity cart = new OrderEntity();
        cart.setUserId(userId); // guest ise null
        cart.setCreatedAt(Instant.now());
        cart.setStatus("CART");
        cart.setItems(new ArrayList<>());

        return orderRepository.save(cart);
    }

    public BasketDTO getBasket(String userId, String cartId) {
        OrderEntity cart = null;

        if (cartId != null && !cartId.isBlank()) {
            cart = orderRepository.findById(cartId)
                    .filter(o -> "CART".equals(o.getStatus()))
                    .orElse(null);
        } else if (userId != null && !userId.isBlank()) {
            cart = orderRepository.findByUserIdAndStatus(userId, "CART");
        }

        if (cart == null) {
            // boş sepet
            BasketDTO dto = new BasketDTO();
            dto.setOrderId(null);
            dto.setItems(new ArrayList<>());
            dto.setSubtotal(BigDecimal.ZERO);
            return dto;
        }

        return mapToBasketDTO(cart);
    }

    public BasketDTO addItem(String userId, String cartId, AddToBasketRequest request) {

        // Sepeti bul veya oluştur
        OrderEntity cart = getOrCreateCart(userId, cartId);

        // Ürünü bul
        ProductEntity product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product not found: " + request.getProductId()
                ));

        // SKU varyantını bul
        ProductEntity.Variant variant = product.getVariants().stream()
                .filter(v -> v.getSku().equals(request.getSku()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Variant not found: " + request.getSku()
                ));

        // STOK KONTROLÜ: ürün stokta yoksa sepete eklenemez
        if (variant.getStock() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Product is out of stock"
            );
        }

        // Sepette aynı SKU + ProductId var mı?
        if (cart.getItems() == null) {
            cart.setItems(new ArrayList<>());
        }

        OrderItem item = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(product.getId())
                        && i.getSku().equals(variant.getSku()))
                .findFirst()
                .orElse(null);

        // Yeni eklenecek miktar
        int requestedQty = request.getQuantity();

        if (item == null) {
            // Yeni item eklerken stok aşımı kontrolü
            if (requestedQty > variant.getStock()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Not enough stock. Available: " + variant.getStock()
                );
            }

            // Yeni item oluşur
            item = new OrderItem();
            item.setProductId(product.getId());
            item.setSku(variant.getSku());

            String name = product.getName();
            if (variant.getColor() != null) name += " - " + variant.getColor();
            if (variant.getSize() != null) name += " (" + variant.getSize() + ")";

            item.setName(name);
            item.setUnitPrice(
                    variant.getPrice() != null ? variant.getPrice() : product.getBasePrice()
            );
            item.setQuantity(requestedQty);
            item.setLineTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(requestedQty)));

            cart.getItems().add(item);
        } else {
            // Mevcutta var → quantity artırmadan önce stok sınırı kontrolü
            int newQty = item.getQuantity() + requestedQty;

            if (newQty > variant.getStock()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Stock limit exceeded. Available: " + variant.getStock()
                );
            }

            item.setQuantity(newQty);
            item.setLineTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(newQty)));
        }

        // Kaydet ve DTO döndür
        orderRepository.save(cart);
        return mapToBasketDTO(cart);
    }

    public BasketDTO updateItem(String userId, String cartId, UpdateBasketItemRequest request) {
        // Sadece mevcut CART üzerinde işlem yapar, yeni yaratmaz:
        OrderEntity cart = null;

        if (cartId != null && !cartId.isBlank()) {
            cart = orderRepository.findById(cartId)
                    .filter(o -> "CART".equals(o.getStatus()))
                    .orElse(null);
        } else if (userId != null && !userId.isBlank()) {
            cart = orderRepository.findByUserIdAndStatus(userId, "CART");
        }

        if (cart == null || cart.getItems() == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Basket not found"
            );
        }

        List<OrderItem> items = cart.getItems();
        OrderItem target = items.stream()
                .filter(i -> i.getProductId().equals(request.getProductId())
                        && i.getSku().equals(request.getSku()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Basket item not found"
                ));

        if (request.getQuantity() <= 0) {
            items.remove(target);
        } else {
            target.setQuantity(request.getQuantity());
            target.setLineTotal(
                    target.getUnitPrice().multiply(BigDecimal.valueOf(request.getQuantity()))
            );
        }

        orderRepository.save(cart);
        return mapToBasketDTO(cart);
    }

    public BasketDTO removeItem(String userId, String cartId, String productId, String sku) {
        OrderEntity cart = null;

        if (cartId != null && !cartId.isBlank()) {
            cart = orderRepository.findById(cartId)
                    .filter(o -> "CART".equals(o.getStatus()))
                    .orElse(null);
        } else if (userId != null && !userId.isBlank()) {
            cart = orderRepository.findByUserIdAndStatus(userId, "CART");
        }

        if (cart == null || cart.getItems() == null) {
            throw new RuntimeException("Basket not found");
        }

        cart.getItems().removeIf(i ->
                i.getProductId().equals(productId) && i.getSku().equals(sku));

        orderRepository.save(cart);
        return mapToBasketDTO(cart);
    }

    private BasketDTO mapToBasketDTO(OrderEntity order) {
        BasketDTO dto = new BasketDTO();
        dto.setOrderId(order.getId());

        List<BasketItemDTO> itemDTOs = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                BasketItemDTO iDto = new BasketItemDTO();
                iDto.setProductId(item.getProductId());
                iDto.setSku(item.getSku());
                iDto.setName(item.getName());
                iDto.setQuantity(item.getQuantity());
                iDto.setUnitPrice(item.getUnitPrice());
                iDto.setLineTotal(item.getLineTotal());

                if (item.getLineTotal() != null) {
                    subtotal = subtotal.add(item.getLineTotal());
                }

                itemDTOs.add(iDto);
            }
        }

        dto.setItems(itemDTOs);
        dto.setSubtotal(subtotal);
        return dto;
    }
}
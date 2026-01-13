package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminProductService {

    private final ProductRepository productRepository;
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public List<ProductEntity> getAllProducts() {
        return productRepository.findAll();
    }

    public ProductEntity createProduct(ProductEntity p) {
        return productRepository.save(p);
    }

    /**
     * PATCH-safe update:
     * - Only updates fields that are explicitly provided (non-null).
     * - Prevents wiping fields like name/category when frontend sends partial objects.
     * - Preserves existing variant stock unless the variant is new.
     */
    // AdminProductService.java  (ONLY replace updateProduct method)

public ProductEntity updateProduct(String id, ProductEntity newData) {
    ProductEntity existing = productRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

    // --- Detect discount ONLY if basePrice is provided ---
    BigDecimal oldPrice = existing.getBasePrice();
    BigDecimal incomingPrice = newData.getBasePrice();

    boolean isDiscount = false;
    double discountRate = 0.0;

    if (incomingPrice != null && oldPrice != null && incomingPrice.compareTo(oldPrice) < 0) {
        isDiscount = true;
        BigDecimal discountAmount = oldPrice.subtract(incomingPrice);
        discountRate = discountAmount.divide(oldPrice, 4, RoundingMode.HALF_UP).doubleValue();
    }

    // --- PATCH semantics: only overwrite fields that are non-null ---
    if (newData.getName() != null) existing.setName(newData.getName());
    if (newData.getDescription() != null) existing.setDescription(newData.getDescription());
    if (newData.getCategory() != null) existing.setCategory(newData.getCategory());

    if (newData.getBasePrice() != null) existing.setBasePrice(newData.getBasePrice());

    if (newData.getMainImageUrl() != null) existing.setMainImageUrl(newData.getMainImageUrl());
    if (newData.getImageUrls() != null) existing.setImageUrls(newData.getImageUrls());

    // --- variants: only merge if variants provided ---
    if (newData.getVariants() != null) {
        var oldList = existing.getVariants();
        java.util.Map<String, ProductEntity.Variant> oldBySku = new java.util.HashMap<>();
        if (oldList != null) {
            for (ProductEntity.Variant v : oldList) {
                if (v != null && v.getSku() != null) oldBySku.put(v.getSku(), v);
            }
        }

        java.util.List<ProductEntity.Variant> merged = new java.util.ArrayList<>();
        for (ProductEntity.Variant incoming : newData.getVariants()) {
            if (incoming == null) continue;

            ProductEntity.Variant old = (incoming.getSku() != null) ? oldBySku.get(incoming.getSku()) : null;

            ProductEntity.Variant v = new ProductEntity.Variant();
            v.setSku(incoming.getSku());
            if (incoming.getSize() != null) v.setSize(incoming.getSize());
            if (incoming.getColor() != null) v.setColor(incoming.getColor());
            if (incoming.getPrice() != null) v.setPrice(incoming.getPrice());

            // stock: preserve old if exists, else use incoming (non-negative)
            if (old != null) v.setStock(old.getStock());
            else v.setStock(Math.max(0, incoming.getStock()));

            merged.add(v);
        }

        existing.setVariants(merged);
    }

    ProductEntity saved = productRepository.save(existing);

    // Notify wishlist users if price was reduced
    if (isDiscount && discountRate > 0) {
        notifyWishlistUsers(saved, discountRate);
    }

    return saved;
}

    /**
     * Notify users who have this product in their wishlist about the discount.
     * (Best effort: notification failure should NOT block product update)
     */
    private void notifyWishlistUsers(ProductEntity product, double discountRate) {
        if (product == null || product.getId() == null) return;

        try {
            List<WishlistEntity> wishlists =
                    wishlistRepository.findAllByProductIdsContaining(product.getId());
            if (wishlists == null || wishlists.isEmpty()) return;

            Map<String, UserEntity> userCache = new HashMap<>();

            for (WishlistEntity wishlist : wishlists) {
                String userId = wishlist.getUserId();
                if (userId == null) continue;

                UserEntity user = userCache.computeIfAbsent(userId,
                        k -> userRepository.findById(k).orElse(null));

                if (user != null) {
                    emailService.sendDiscountNotification(user, product, discountRate);
                }
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AdminProductService.class)
                    .warn("Failed to notify wishlist users about discount for product {}", product.getId(), e);
        }
    }

    public void deleteProduct(String id) {
        if (!productRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        productRepository.deleteById(id);
    }

    public ProductEntity updateVariantStock(String productId, String sku, int newStock) {
        ProductEntity p = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (p.getVariants() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product has no variants");
        }

        ProductEntity.Variant v = p.getVariants().stream()
                .filter(var -> sku != null && sku.equals(var.getSku()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Variant not found for sku=" + sku));

        if (newStock < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stock cannot be negative");
        }

        v.setStock(newStock);
        return productRepository.save(p);
    }
}

package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

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

    public ProductEntity updateProduct(String id, ProductEntity newData) {
        ProductEntity existing = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        // Check if price is being reduced (discount applied)
        BigDecimal oldPrice = existing.getBasePrice();
        BigDecimal newPrice = newData.getBasePrice();
        boolean isDiscount = false;
        double discountRate = 0.0;

        if (oldPrice != null && newPrice != null && newPrice.compareTo(oldPrice) < 0) {
            // Price decreased - calculate discount rate
            isDiscount = true;
            BigDecimal discountAmount = oldPrice.subtract(newPrice);
            discountRate = discountAmount.divide(oldPrice, 4, RoundingMode.HALF_UP).doubleValue();
        }

        existing.setName(newData.getName());
        existing.setDescription(newData.getDescription());
        existing.setCategory(newData.getCategory());
        existing.setBasePrice(newData.getBasePrice());
        existing.setMainImageUrl(newData.getMainImageUrl());
        existing.setImageUrls(newData.getImageUrls());

        // variants update: stock'u EZME, sadece diğer alanları güncelle
        if (newData.getVariants() != null) {
            var oldList = existing.getVariants();
            java.util.Map<String, ProductEntity.Variant> oldBySku = new java.util.HashMap<>();
            if (oldList != null) {
                for (ProductEntity.Variant v : oldList) {
                    if (v.getSku() != null) oldBySku.put(v.getSku(), v);
                }
            }

            java.util.List<ProductEntity.Variant> merged = new java.util.ArrayList<>();
            for (ProductEntity.Variant incoming : newData.getVariants()) {
                if (incoming == null) continue;

                ProductEntity.Variant old = (incoming.getSku() != null) ? oldBySku.get(incoming.getSku()) : null;

                ProductEntity.Variant v = new ProductEntity.Variant();
                v.setSku(incoming.getSku());
                v.setSize(incoming.getSize());
                v.setColor(incoming.getColor());
                v.setPrice(incoming.getPrice());

                // stock: eski varsa onu koru, yoksa incoming ya da 0
                if (old != null) v.setStock(old.getStock());
                else v.setStock(Math.max(0, incoming.getStock()));

                merged.add(v);
            }

            existing.setVariants(merged);
        }

        ProductEntity saved = productRepository.save(existing);

        // Notify wishlist users if price was reduced (discount applied)
        if (isDiscount && discountRate > 0) {
            notifyWishlistUsers(saved, discountRate);
        }

        return saved;
    }

    /**
     * Notify users who have this product in their wishlist about the discount
     */
    private void notifyWishlistUsers(ProductEntity product, double discountRate) {
        if (product == null || product.getId() == null) return;

        try {
            List<WishlistEntity> wishlists = wishlistRepository.findAllByProductIdsContaining(product.getId());
            if (wishlists == null || wishlists.isEmpty()) return;

            // Use a cache to avoid duplicate emails to the same user
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
            // Log but don't fail the product update if email notification fails
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Variant not found for sku=" + sku));

        if (newStock < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stock cannot be negative");
        }

        v.setStock(newStock);
        return productRepository.save(p);
    }
}
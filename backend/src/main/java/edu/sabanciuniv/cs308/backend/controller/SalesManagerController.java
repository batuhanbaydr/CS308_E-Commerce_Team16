package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import edu.sabanciuniv.cs308.backend.request.DiscountSetRequest;
import edu.sabanciuniv.cs308.backend.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/sales")
public class SalesManagerController {

    private final ProductRepository productRepository;
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public SalesManagerController(ProductRepository productRepository,
                                  WishlistRepository wishlistRepository,
                                  UserRepository userRepository,
                                  EmailService emailService) {
        this.productRepository = productRepository;
        this.wishlistRepository = wishlistRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @PreAuthorize("hasRole('SALES_MANAGER')")
    @PutMapping("/discounts")
    public ResponseEntity<?> setDiscounts(@RequestBody DiscountSetRequest req) {

        // ---- validations ----
        if (req.getProductIds() == null || req.getProductIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "productIds is required"));
        }
        if (req.getDiscountPercent() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "discountPercent is required"));
        }
        BigDecimal dp = req.getDiscountPercent();
        if (dp.compareTo(BigDecimal.ZERO) < 0 || dp.compareTo(new BigDecimal("100")) > 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "discountPercent must be between 0 and 100"));
        }

        // ---- load products ----
        List<ProductEntity> products = productRepository.findAllById(req.getProductIds());
        if (products.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No products found for given ids"));
        }

        // ---- update discount fields ----
        for (ProductEntity p : products) {
            p.setDiscountPercent(dp);
            p.setDiscountStartAt(req.getStartAt());
            p.setDiscountEndAt(req.getEndAt());
        }
        productRepository.saveAll(products);

        int notifiedUsers = 0;

        // ---- (Step 5) find wishlist users + notify ----
        if (req.isNotifyWishlistUsers()) {

            Map<String, ProductEntity> productsById = products.stream()
                    .filter(p -> p != null && p.getId() != null)
                    .collect(Collectors.toMap(ProductEntity::getId, x -> x, (a, b) -> a));

            // Collect all wishlists containing any of the discounted productIds
            List<WishlistEntity> wishlists = new ArrayList<>();
            for (String pid : req.getProductIds()) {
                wishlists.addAll(wishlistRepository.findAllByProductIdsContaining(pid));
            }

            // userKey (email or id) -> productIds (unique)
            Map<String, Set<String>> userKeyToProductIds = new HashMap<>();

            for (WishlistEntity w : wishlists) {
                if (w == null) continue;
                if (w.getUserId() == null || w.getUserId().isBlank()) continue;
                if (w.getProductIds() == null || w.getProductIds().isEmpty()) continue;

                for (String pid : w.getProductIds()) {
                    if (pid == null || pid.isBlank()) continue;

                    if (productsById.containsKey(pid)) {
                        userKeyToProductIds
                                .computeIfAbsent(w.getUserId(), k -> new HashSet<>())
                                .add(pid);
                    }
                }
            }

            double rate = dp.doubleValue() / 100.0;

            for (Map.Entry<String, Set<String>> entry : userKeyToProductIds.entrySet()) {
                String userKey = entry.getKey();   // WishlistController uses auth.getName() -> usually email
                Set<String> pids = entry.getValue();

                if (userKey == null || userKey.isBlank()) continue;
                if (pids == null || pids.isEmpty()) continue;

                UserEntity u;

                // If it looks like an email, resolve via email. Otherwise treat it as DB id.
                if (userKey.contains("@")) {
                    u = userRepository.findByEmailAddress(userKey).orElse(null);
                } else {
                    u = userRepository.findById(userKey).orElse(null);
                }

                if (u == null) continue;

                for (String pid : pids) {
                    ProductEntity p = productsById.get(pid);
                    if (p == null) continue;
                    emailService.sendDiscountNotification(u, p, rate);
                }

                notifiedUsers++;
            }
        }

        // IMPORTANT: Map.of(...) does NOT allow null values (startAt/endAt can be null)
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("updatedProducts", products.size());
        resp.put("notifiedUsers", notifiedUsers);
        resp.put("discountPercent", dp);
        resp.put("startAt", req.getStartAt());
        resp.put("endAt", req.getEndAt());

        return ResponseEntity.ok(resp);
    }
}

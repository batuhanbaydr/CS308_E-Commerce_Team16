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
import java.util.ArrayList;

@RestController
@RequestMapping("/api/sales")
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
                    .collect(Collectors.toMap(ProductEntity::getId, x -> x));

            List<WishlistEntity> wishlists = new ArrayList<>();
            for (String pid : req.getProductIds()) {
                wishlists.addAll(wishlistRepository.findAllByProductIdsContaining(pid));
            }
            // userId -> productIds (unique)
            Map<String, Set<String>> userToProductIds = new HashMap<>();

            for (WishlistEntity w : wishlists) {
                if (w.getUserId() == null) continue;

                for (String pid : w.getProductIds()) {
                    if (productsById.containsKey(pid)) {
                        userToProductIds
                                .computeIfAbsent(w.getUserId(), k -> new HashSet<>())
                                .add(pid);
                    }
                }
            }

            List<UserEntity> users = userRepository.findAllById(userToProductIds.keySet());

            // quick version: product-by-product mail using your existing method
            double rate = dp.doubleValue() / 100.0;

            for (UserEntity u : users) {
                Set<String> pids = userToProductIds.get(u.getId());
                if (pids == null || pids.isEmpty()) continue;

                for (String pid : pids) {
                    ProductEntity p = productsById.get(pid);
                    if (p == null) continue;
                    emailService.sendDiscountNotification(u, p, rate);
                }
                notifiedUsers++;
            }
        }

        return ResponseEntity.ok(Map.of(
                "updatedProducts", products.size(),
                "notifiedUsers", notifiedUsers,
                "discountPercent", dp,
                "startAt", req.getStartAt(),
                "endAt", req.getEndAt()
        ));
    }
}


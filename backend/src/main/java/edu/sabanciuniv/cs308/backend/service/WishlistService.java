package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.WishlistResponseDTO;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;

    public WishlistResponseDTO getWishlist(String userId) {
        WishlistEntity w = findOrCreateAndDedupWishlist(userId);
        return toResponse(w);
    }

    public WishlistResponseDTO addItem(String userId, String productId) {
        WishlistEntity w = findOrCreateAndDedupWishlist(userId);

        Set<String> ids = ensureProductIds(w);
        ids.add(productId); // Set prevents duplicates

        w.setUpdatedAt(Instant.now());
        w = wishlistRepository.save(w);

        return toResponse(w);
    }

    public WishlistResponseDTO removeItem(String userId, String productId) {
        WishlistEntity w = findOrCreateAndDedupWishlist(userId);

        Set<String> ids = ensureProductIds(w);
        ids.remove(productId);

        w.setUpdatedAt(Instant.now());
        w = wishlistRepository.save(w);

        return toResponse(w);
    }

    public WishlistResponseDTO clear(String userId) {
        WishlistEntity w = findOrCreateAndDedupWishlist(userId);

        Set<String> ids = ensureProductIds(w);
        ids.clear();

        w.setUpdatedAt(Instant.now());
        w = wishlistRepository.save(w);

        return toResponse(w);
    }

    // -------------------- helpers --------------------

    /**
     * FIXES your current 500:
     * If DB contains multiple wishlists for same userId,
     * Spring used to throw IncorrectResultSizeDataAccessException.
     *
     * Here we:
     *  - fetch all docs
     *  - choose one "primary"
     *  - merge productIds from all duplicates into primary
     *  - delete extras
     *  - save primary
     */
    private WishlistEntity findOrCreateAndDedupWishlist(String userId) {
        List<WishlistEntity> all = wishlistRepository.findAllByUserId(userId);

        if (all == null || all.isEmpty()) {
            return wishlistRepository.save(newWishlist(userId));
        }

        // Choose a primary wishlist:
        // Prefer most recently updated, else just first.
        WishlistEntity primary = all.stream()
                .max(Comparator.comparing(w -> {
                    Instant t = w.getUpdatedAt();
                    return t != null ? t : Instant.EPOCH;
                }))
                .orElse(all.get(0));

        // Merge all productIds into primary (null-safe)
        Set<String> merged = new LinkedHashSet<>();
        for (WishlistEntity w : all) {
            if (w == null) continue;
            Set<String> ids = w.getProductIds();
            if (ids != null) merged.addAll(ids);
        }

        primary.setProductIds(merged);
        primary.setUpdatedAt(Instant.now());

        // Delete duplicates (all except primary)
        for (WishlistEntity w : all) {
            if (w == null) continue;
            if (!Objects.equals(w.getId(), primary.getId())) {
                wishlistRepository.delete(w);
            }
        }

        // Save merged primary
        return wishlistRepository.save(primary);
    }

    private WishlistEntity newWishlist(String userId) {
        WishlistEntity w = new WishlistEntity();
        w.setUserId(userId);
        w.setCreatedAt(Instant.now());
        w.setUpdatedAt(Instant.now());
        w.setProductIds(new LinkedHashSet<>()); // IMPORTANT: init Set
        return w;
    }

    private Set<String> ensureProductIds(WishlistEntity w) {
        if (w.getProductIds() == null) {
            w.setProductIds(new LinkedHashSet<>());
        }
        return w.getProductIds();
    }

    private WishlistResponseDTO toResponse(WishlistEntity w) {
        Set<String> idSet = ensureProductIds(w);

        // Your DTO expects List<String> (based on earlier file),
        // so convert Set -> List for JSON.
        List<String> ids = new ArrayList<>(idSet);

        List<ProductEntity> products = ids.isEmpty()
                ? Collections.emptyList()
                : StreamSupport.stream(productRepository.findAllById(ids).spliterator(), false)
                .collect(Collectors.toList());

        return new WishlistResponseDTO(ids, ids.size(), products);
    }
}

package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.WishlistResponseDTO;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;

    // Eğer ProductRepository'in varsa buraya ekleyip doğrulama yapacağız
    // private final ProductRepository productRepository;

    private final ProductService productService; // Projede varsa ürünleri çekmek için kullanabiliriz
    private final ProductRepository productRepository;


    public WishlistResponseDTO getWishlist(String userId) {
        WishlistEntity w = wishlistRepository.findByUserId(userId)
                .orElseGet(() -> wishlistRepository.save(newWishlist(userId)));

        return toResponse(w);
    }

    public WishlistResponseDTO addItem(String userId, String productId) {
        WishlistEntity w = wishlistRepository.findByUserId(userId)
                .orElseGet(() -> newWishlist(userId));

        w.getProductIds().add(productId);
        w.setUpdatedAt(Instant.now());
        w = wishlistRepository.save(w);

        return toResponse(w);
    }

    public WishlistResponseDTO removeItem(String userId, String productId) {
        WishlistEntity w = wishlistRepository.findByUserId(userId)
                .orElseGet(() -> wishlistRepository.save(newWishlist(userId)));

        w.getProductIds().remove(productId);
        w.setUpdatedAt(Instant.now());
        w = wishlistRepository.save(w);

        return toResponse(w);
    }

    public WishlistResponseDTO clear(String userId) {
        WishlistEntity w = wishlistRepository.findByUserId(userId)
                .orElseGet(() -> wishlistRepository.save(newWishlist(userId)));

        w.getProductIds().clear();
        w.setUpdatedAt(Instant.now());
        w = wishlistRepository.save(w);

        return toResponse(w);
    }

    private WishlistEntity newWishlist(String userId) {
        WishlistEntity w = new WishlistEntity();
        w.setUserId(userId);
        w.setCreatedAt(Instant.now());
        w.setUpdatedAt(Instant.now());
        return w;
    }

    private WishlistResponseDTO toResponse(WishlistEntity w) {
        List<String> ids = new ArrayList<>(w.getProductIds());

        // Ürün detaylarını dönmek istersen:
        // productService.getProducts(null) gibi değil,
        // elinde "ids ile fetch" yoksa şimdilik boş dön.
        List<ProductEntity> products = ids.isEmpty()
                ? List.of()
                : streamToList(productRepository.findAllById(ids));



        // Eğer ProductService içinde ids ile fetch edebiliyorsan burada doldur:
        // products = productService.getProductsByIds(ids);

        return new WishlistResponseDTO(ids, ids.size(), products);
    }
    private List<ProductEntity> streamToList(Iterable<ProductEntity> it) {
        return StreamSupport.stream(it.spliterator(), false).toList();
    }

}

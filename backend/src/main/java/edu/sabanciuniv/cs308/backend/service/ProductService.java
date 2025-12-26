package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.ProductRatingAggregate;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepo;
    private final ReviewRepository reviewRepository;

    public ProductService(ProductRepository productRepo,
                          ReviewRepository reviewRepository) {
        this.productRepo = productRepo;
        this.reviewRepository = reviewRepository;
    }

    public List<ProductEntity> getProducts(String category) {
        // 1) ürünleri çek
        List<ProductEntity> products;
        if (category != null && !category.isBlank()) {
            products = productRepo.findByCategory(category);
        } else {
            products = productRepo.findAll();
        }

        // 2) rating hesapla + ürünlere set et
        if (!products.isEmpty()) {
            List<String> ids = products.stream()
                    .map(ProductEntity::getId)
                    .toList();

            List<ProductRatingAggregate> aggregates =
                    reviewRepository.calculateRatingsByProductIds(ids);

            Map<String, ProductRatingAggregate> ratingMap = aggregates.stream()
                    .collect(Collectors.toMap(ProductRatingAggregate::getProductId, a -> a));

            for (ProductEntity p : products) {
                ProductRatingAggregate agg = ratingMap.get(p.getId());
                if (agg != null) {
                    p.setAverageRating(agg.getAverageRating());
                    p.setRatingCount(agg.getRatingCount());
                } else {
                    p.setAverageRating(0.0);
                    p.setRatingCount(0L);
                }
            }
        }

        Instant now = Instant.now();
        for (ProductEntity p : products) {
            p.setEffectiveBasePrice(ProductPricing.effectiveBasePrice(p, now));

            if (p.getVariants() != null) {
                for (ProductEntity.Variant v : p.getVariants()) {
                    v.setEffectivePrice(ProductPricing.effectiveVariantPrice(p, v.getSku(), now));
                }
            }
        }

        // 3) döndür
        return products;
    }

    public ProductEntity getById(String id) {
        ProductEntity p = productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));

        Instant now = Instant.now();
        p.setEffectiveBasePrice(ProductPricing.effectiveBasePrice(p, now));

        if (p.getVariants() != null) {
            for (ProductEntity.Variant v : p.getVariants()) {
                v.setEffectivePrice(ProductPricing.effectiveVariantPrice(p, v.getSku(), now));
            }
        }

        return p;
    }

    public ProductEntity create(ProductEntity product) {
        return productRepo.save(product);
    }
}

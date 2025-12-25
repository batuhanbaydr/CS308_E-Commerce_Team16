package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminProductService {

    private final ProductRepository productRepository;

    public List<ProductEntity> getAllProducts() {
        return productRepository.findAll();
    }

    public ProductEntity createProduct(ProductEntity p) {
        return productRepository.save(p);
    }

    public ProductEntity updateProduct(String id, ProductEntity newData) {
        ProductEntity existing = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

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

        return productRepository.save(existing);
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
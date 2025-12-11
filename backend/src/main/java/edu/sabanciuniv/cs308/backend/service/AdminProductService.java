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
        existing.setVariants(newData.getVariants());

        return productRepository.save(existing);
    }

    public void deleteProduct(String id) {
        if (!productRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        productRepository.deleteById(id);
    }
}
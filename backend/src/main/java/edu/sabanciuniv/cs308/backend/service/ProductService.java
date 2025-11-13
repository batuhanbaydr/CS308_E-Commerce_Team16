package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepo;

    public ProductService(ProductRepository productRepo) {
        this.productRepo = productRepo;
    }

    public List<ProductEntity> getProducts(String category) {
        if (category != null && !category.isBlank()) {
            return productRepo.findByCategory(category);
        }
        return productRepo.findAll();
    }

    public ProductEntity getById(String id) {
        return productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
    }

    public ProductEntity create(ProductEntity product) {
        return productRepo.save(product);
    }
}

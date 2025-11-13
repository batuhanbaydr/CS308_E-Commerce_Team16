package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // Listeleme
    // GET /api/products
    // GET /api/products?category=Elbise
    @GetMapping
    public List<ProductEntity> list(@RequestParam(required = false) String category) {
        return productService.getProducts(category);
    }

    // Tek ürün detayı
    // GET /api/products/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ProductEntity> get(@PathVariable String id) {
        ProductEntity p = productService.getById(id);
        return ResponseEntity.ok(p);
    }

    // Ürün oluştur (test/admin amaçlı)
    // POST /api/products
    @PostMapping
    public ResponseEntity<ProductEntity> create(@RequestBody ProductEntity p) {
        ProductEntity created = productService.create(p);
        return ResponseEntity.status(201).body(created);
    }
}

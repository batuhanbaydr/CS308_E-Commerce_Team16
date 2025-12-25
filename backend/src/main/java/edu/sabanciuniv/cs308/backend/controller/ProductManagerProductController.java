package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.service.AdminProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final AdminProductService adminProductService;

    // 🔐 Sadece PRODUCT_MANAGER erişsin
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    @GetMapping
    public ResponseEntity<List<ProductEntity>> list() {
        return ResponseEntity.ok(adminProductService.getAllProducts());
    }

    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    @PostMapping
    public ResponseEntity<ProductEntity> create(@RequestBody ProductEntity product) {
        return ResponseEntity.ok(adminProductService.createProduct(product));
    }

    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductEntity> update(
            @PathVariable String id,
            @RequestBody ProductEntity product
    ) {
        return ResponseEntity.ok(adminProductService.updateProduct(id, product));
    }

    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        adminProductService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.service.AdminProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/product/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PRODUCT_MANAGER')")
public class ProductManagerProductController {

    private final AdminProductService adminProductService;

    @GetMapping
    public ResponseEntity<List<ProductEntity>> list() {
        return ResponseEntity.ok(adminProductService.getAllProducts());
    }

    @PostMapping
    public ResponseEntity<ProductEntity> create(@RequestBody ProductEntity product) {
        return ResponseEntity.ok(adminProductService.createProduct(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductEntity> update(
            @PathVariable String id,
            @RequestBody ProductEntity product
    ) {
        return ResponseEntity.ok(adminProductService.updateProduct(id, product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        adminProductService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/variants/{sku}/stock")
    public ResponseEntity<ProductEntity> setVariantStock(
            @PathVariable String id,
            @PathVariable String sku,
            @RequestParam int stock
    ) {
        return ResponseEntity.ok(adminProductService.updateVariantStock(id, sku, stock));
    }
}
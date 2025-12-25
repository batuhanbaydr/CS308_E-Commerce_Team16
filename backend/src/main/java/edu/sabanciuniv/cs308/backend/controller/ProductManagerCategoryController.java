package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.CategoryEntity;
import edu.sabanciuniv.cs308.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/product/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PRODUCT_MANAGER')")
public class ProductManagerCategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<CategoryEntity>> list() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "name is required"));
        if (categoryRepository.existsByName(name)) return ResponseEntity.status(409).body(Map.of("message", "Category already exists"));

        CategoryEntity c = new CategoryEntity();
        c.setName(name.trim());
        return ResponseEntity.ok(categoryRepository.save(c));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
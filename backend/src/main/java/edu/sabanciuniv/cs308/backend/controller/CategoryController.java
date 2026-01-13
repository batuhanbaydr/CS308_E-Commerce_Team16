package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.CategoryEntity;
import edu.sabanciuniv.cs308.backend.repository.CategoryRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<CategoryEntity> listCategories() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
    }
}

package edu.sabanciuniv.cs308.backend.dto;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class WishlistResponseDTO {
    private List<String> productIds;
    private int count;
    private List<ProductEntity> products;
}

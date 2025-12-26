package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;

public final class ProductPricing {

    private ProductPricing() {}

    public static boolean isDiscountActive(ProductEntity p, Instant now) {
        if (p == null) return false;
        if (p.getDiscountPercent() == null) return false;

        BigDecimal dp = p.getDiscountPercent();
        if (dp.compareTo(BigDecimal.ZERO) <= 0) return false;

        Instant start = p.getDiscountStartAt();
        Instant end = p.getDiscountEndAt();

        if (start != null && now.isBefore(start)) return false;
        if (end != null && now.isAfter(end)) return false;

        return true;
    }

    public static BigDecimal applyDiscount(BigDecimal price, BigDecimal discountPercent) {
        if (price == null) return null;
        if (discountPercent == null) return price;

        // price * (100 - dp) / 100
        BigDecimal hundred = new BigDecimal("100");
        BigDecimal multiplier = hundred.subtract(discountPercent).divide(hundred, 6, RoundingMode.HALF_UP);

        BigDecimal discounted = price.multiply(multiplier);
        return discounted.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal effectiveBasePrice(ProductEntity p, Instant now) {
        if (p == null) return null;
        BigDecimal base = p.getBasePrice();
        if (!isDiscountActive(p, now)) return base;
        return applyDiscount(base, p.getDiscountPercent());
    }

    public static BigDecimal effectiveVariantPrice(ProductEntity p, String sku, Instant now) {
        if (p == null) return null;

        BigDecimal variantPrice = null;
        if (sku != null && p.getVariants() != null) {
            for (ProductEntity.Variant v : p.getVariants()) {
                if (Objects.equals(v.getSku(), sku)) {
                    variantPrice = v.getPrice();
                    break;
                }
            }
        }

        // Variant price yoksa basePrice fallback
        BigDecimal raw = (variantPrice != null) ? variantPrice : p.getBasePrice();

        if (!isDiscountActive(p, now)) return raw;
        return applyDiscount(raw, p.getDiscountPercent());
    }

    public static BigDecimal effectiveUnitPrice(ProductEntity p, String sku, Instant now) {
        return effectiveVariantPrice(p, sku, now);
    }
}

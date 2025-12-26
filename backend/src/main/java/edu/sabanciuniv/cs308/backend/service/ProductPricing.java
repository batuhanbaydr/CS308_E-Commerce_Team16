package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.entity.ProductEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

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

    public static BigDecimal applyDiscount(BigDecimal base, BigDecimal discountPercent) {
        if (base == null) return null;
        if (discountPercent == null) return base;

        if (discountPercent.compareTo(BigDecimal.ZERO) <= 0) return base;

        // multiplier = (100 - dp) / 100
        BigDecimal hundred = new BigDecimal("100");
        BigDecimal multiplier = hundred.subtract(discountPercent).divide(hundred, 6, RoundingMode.HALF_UP);

        // 2 decimal para yuvarlama
        return base.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal effectiveUnitPrice(ProductEntity p, String sku, Instant now) {
        if (p == null) return null;

        BigDecimal base = p.getBasePrice();

        // Variant price varsa onu baz al (sku ile)
        if (sku != null && p.getVariants() != null) {
            for (ProductEntity.Variant v : p.getVariants()) {
                if (v != null && sku.equals(v.getSku()) && v.getPrice() != null) {
                    base = v.getPrice();
                    break;
                }
            }
        }

        if (!isDiscountActive(p, now)) return base;
        return applyDiscount(base, p.getDiscountPercent());
    }
}

package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.ApplyDiscountRequest;
import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.dto.SalesAdminDTO;
import edu.sabanciuniv.cs308.backend.entity.OrderEntity;
import edu.sabanciuniv.cs308.backend.entity.OrderItem;
import edu.sabanciuniv.cs308.backend.entity.ProductEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.entity.WishlistEntity;
import edu.sabanciuniv.cs308.backend.repository.OrderRepository;
import edu.sabanciuniv.cs308.backend.repository.ProductRepository;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.repository.WishlistRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SalesAdminService {

    private final ProductRepository productRepository;
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final EmailService emailService;

    public SalesAdminService(ProductRepository productRepository,
                             WishlistRepository wishlistRepository,
                             UserRepository userRepository,
                             OrderRepository orderRepository,
                             EmailService emailService) {
        this.productRepository = productRepository;
        this.wishlistRepository = wishlistRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.emailService = emailService;
    }

    // ----------------------------
    // 1) Discount + wishlist notify
    // ----------------------------
    public SalesAdminDTO.DiscountResult applyDiscount(ApplyDiscountRequest req) {
        if (req == null || req.getProductIds() == null || req.getProductIds().isEmpty()) {
            return new SalesAdminDTO.DiscountResult(0, 0);
        }

        double rate = req.getDiscountRate();
        if (rate <= 0 || rate >= 1) {
            throw new IllegalArgumentException("discountRate must be between (0,1), e.g., 0.15");
        }

        List<ProductEntity> products = productRepository.findAllById(req.getProductIds());

        // update product prices (base + variants)
        for (ProductEntity p : products) {
            if (p.getBasePrice() != null) {
                p.setBasePrice(applyRate(p.getBasePrice(), rate));
            }
            if (p.getVariants() != null) {
                for (ProductEntity.Variant v : p.getVariants()) {
                    if (v.getPrice() != null) {
                        v.setPrice(applyRate(v.getPrice(), rate));
                    }
                }
            }
        }
        productRepository.saveAll(products);

        // notify users who have product in wishlist (if notifyWishlist is true or not specified)
        // (duplicate wishlist docs olabilir diye user cache kullandım)
        int notifiedEmails = 0;
        boolean shouldNotify = req.getNotifyWishlist() == null || req.getNotifyWishlist();
        
        if (shouldNotify) {
            Map<String, UserEntity> userCache = new HashMap<>();

            for (ProductEntity p : products) {
                List<WishlistEntity> wishlists = wishlistRepository.findAllByProductIdsContaining(p.getId());
                for (WishlistEntity w : wishlists) {
                    String uid = w.getUserId();
                    if (uid == null) continue;

                    UserEntity u = userCache.computeIfAbsent(uid,
                            k -> userRepository.findById(k).orElse(null));

                    if (u != null) {
                        emailService.sendDiscountNotification(u, p, rate);
                        notifiedEmails++;
                    }
                }
            }
        }

        return new SalesAdminDTO.DiscountResult(products.size(), notifiedEmails);
    }

    private BigDecimal applyRate(BigDecimal price, double rate) {
        BigDecimal multiplier = BigDecimal.ONE.subtract(BigDecimal.valueOf(rate));
        return price.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
    }

    // ----------------------------
    // 2) Invoice list by date range
    // ----------------------------
    public List<SalesAdminDTO.InvoiceRow> listInvoices(Instant start, Instant end) {
        List<OrderEntity> orders = orderRepository.findByCreatedAtBetween(start, end);

        return orders.stream()
                .sorted(Comparator.comparing(OrderEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .map(o -> new SalesAdminDTO.InvoiceRow(
                        o.getId(),
                        o.getUserId(),
                        o.getCreatedAt(),
                        o.getStatus(),
                        safeGrandTotal(o)
                ))
                .collect(Collectors.toList());
    }

    private BigDecimal safeGrandTotal(OrderEntity o) {
        if (o == null || o.getTotals() == null || o.getTotals().getGrandTotal() == null) return BigDecimal.ZERO;
        return o.getTotals().getGrandTotal();
    }

    // ----------------------------
    // 3) Invoice PDF download
    // ----------------------------
    public byte[] generateInvoicePdf(String orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order not found: " + orderId));

        UserEntity user = userRepository.findById(order.getUserId()).orElse(null);
        if (user == null) {
            user = new UserEntity();
            user.setName("Customer");
            user.setEmailAddress("unknown");
        }

        OrderDetailDTO dto = mapToOrderDetailDTO(order);
        return emailService.generateInvoicePdfBytes(user, dto);
    }

    private OrderDetailDTO mapToOrderDetailDTO(OrderEntity order) {
        OrderDetailDTO dto = new OrderDetailDTO();
        dto.setId(order.getId());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setStatus(order.getStatus());
        dto.setPaymentMethodRef(order.getPaymentMethodRef());

        // totals
        if (order.getTotals() != null) {
            OrderDetailDTO.MoneyDTO m = new OrderDetailDTO.MoneyDTO();
            m.setSubtotal(order.getTotals().getSubtotal());
            m.setTax(order.getTotals().getTax());
            m.setShipping(order.getTotals().getShipping());
            m.setGrandTotal(order.getTotals().getGrandTotal());
            dto.setTotals(m);
        }

        // items
        if (order.getItems() != null) {
            List<OrderDetailDTO.OrderItemDTO> items = new ArrayList<>();
            for (OrderItem it : order.getItems()) {
                OrderDetailDTO.OrderItemDTO x = new OrderDetailDTO.OrderItemDTO();
                x.setProductId(it.getProductId());
                x.setSku(it.getSku());
                x.setName(it.getName());
                x.setQuantity(it.getQuantity());
                x.setUnitPrice(it.getUnitPrice());
                x.setLineTotal(it.getLineTotal());
                items.add(x);
            }
            dto.setItems(items);
        }

        return dto;
    }

    // ----------------------------
    // 4) Revenue / Profit (default cost = 50%)
    // ----------------------------
    public SalesAdminDTO.RevenueProfitSummary revenueProfit(Instant start, Instant end, String groupBy) {
        List<String> includedStatuses = List.of("PLACED", "SHIPPED", "DELIVERED");
        List<OrderEntity> orders = orderRepository.findByStatusInAndCreatedAtBetween(includedStatuses, start, end);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        Map<String, BigDecimal> revByBucket = new LinkedHashMap<>();
        Map<String, BigDecimal> profitByBucket = new LinkedHashMap<>();

        for (OrderEntity o : orders) {
            BigDecimal revenue = safeGrandTotal(o);
            BigDecimal cost = estimateCostDefault50(o);

            totalRevenue = totalRevenue.add(revenue);
            totalCost = totalCost.add(cost);

            String bucket = bucketOf(o.getCreatedAt(), groupBy);
            revByBucket.put(bucket, revByBucket.getOrDefault(bucket, BigDecimal.ZERO).add(revenue));
            profitByBucket.put(bucket, profitByBucket.getOrDefault(bucket, BigDecimal.ZERO).add(revenue.subtract(cost)));
        }

        BigDecimal profit = totalRevenue.subtract(totalCost);

        List<SalesAdminDTO.SeriesPoint> series = revByBucket.keySet().stream()
                .map(b -> new SalesAdminDTO.SeriesPoint(
                        b,
                        revByBucket.getOrDefault(b, BigDecimal.ZERO),
                        profitByBucket.getOrDefault(b, BigDecimal.ZERO)
                ))
                .collect(Collectors.toList());

        return new SalesAdminDTO.RevenueProfitSummary(
                totalRevenue.setScale(2, RoundingMode.HALF_UP),
                totalCost.setScale(2, RoundingMode.HALF_UP),
                profit.setScale(2, RoundingMode.HALF_UP),
                series
        );
    }

    private BigDecimal estimateCostDefault50(OrderEntity o) {
        if (o == null || o.getItems() == null) return BigDecimal.ZERO;

        BigDecimal saleValue = BigDecimal.ZERO;
        for (OrderItem it : o.getItems()) {
            BigDecimal line = it.getLineTotal();
            if (line == null) {
                BigDecimal up = it.getUnitPrice() == null ? BigDecimal.ZERO : it.getUnitPrice();
                line = up.multiply(BigDecimal.valueOf(it.getQuantity()));
            }
            saleValue = saleValue.add(line);
        }

        return saleValue.multiply(BigDecimal.valueOf(0.5)).setScale(2, RoundingMode.HALF_UP);
    }

    private String bucketOf(Instant createdAt, String groupBy) {
        if (createdAt == null) return "unknown";

        // timezone is not critical; pick one deterministic
        ZoneId zone = ZoneId.of("Europe/Istanbul");
        ZonedDateTime zdt = createdAt.atZone(zone);

        String g = (groupBy == null) ? "day" : groupBy.toLowerCase(Locale.ROOT);
        switch (g) {
            case "month":
                return zdt.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            case "week": {
                int week = zdt.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                int year = zdt.get(IsoFields.WEEK_BASED_YEAR);
                return String.format("%d-W%02d", year, week);
            }
            default:
                return zdt.toLocalDate().toString(); // yyyy-MM-dd
        }
    }
}

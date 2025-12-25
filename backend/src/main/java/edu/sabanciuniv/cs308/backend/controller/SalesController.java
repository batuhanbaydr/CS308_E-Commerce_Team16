package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.ApplyDiscountRequest;
import edu.sabanciuniv.cs308.backend.service.SalesAdminService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/admin/sales")
@PreAuthorize("hasRole('SALES_MANAGER')")
public class SalesController {

    private final SalesAdminService salesAdminService;

    public SalesController(SalesAdminService salesAdminService) {
        this.salesAdminService = salesAdminService;
    }

    // 1) Discount: selected products + notify wishlists
    @PostMapping("/discount")
    public ResponseEntity<?> applyDiscount(@RequestBody ApplyDiscountRequest req) {
        return ResponseEntity.ok(salesAdminService.applyDiscount(req));
    }

    // 2) Invoice list by date range
    // Example: /api/admin/sales/invoices?start=2025-12-01T00:00:00Z&end=2025-12-31T23:59:59Z
    @GetMapping("/invoices")
    public ResponseEntity<?> listInvoices(@RequestParam Instant start,
                                          @RequestParam Instant end) {
        return ResponseEntity.ok(salesAdminService.listInvoices(start, end));
    }

    // 3) Invoice PDF download
    @GetMapping("/invoices/{orderId}/pdf")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable String orderId) {
        byte[] pdf = salesAdminService.generateInvoicePdf(orderId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=invoice-" + orderId + ".pdf")
                .body(pdf);
    }

    // 4) Revenue / Profit + series for chart
    // Example: /api/admin/sales/revenue-profit?start=...&end=...&groupBy=day|week|month
    @GetMapping("/revenue-profit")
    public ResponseEntity<?> revenueProfit(@RequestParam Instant start,
                                           @RequestParam Instant end,
                                           @RequestParam(defaultValue = "day") String groupBy) {
        return ResponseEntity.ok(salesAdminService.revenueProfit(start, end, groupBy));
    }
}

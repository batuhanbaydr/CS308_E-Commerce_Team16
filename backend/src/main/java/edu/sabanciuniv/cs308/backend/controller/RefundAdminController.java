package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.RefundRequestEntity;
import edu.sabanciuniv.cs308.backend.enums.RefundStatus;
import edu.sabanciuniv.cs308.backend.request.RefundDecisionRequest;
import edu.sabanciuniv.cs308.backend.service.RefundService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/refunds")

public class RefundAdminController {

    private final RefundService refundService;

    public RefundAdminController(RefundService refundService) {
        this.refundService = refundService;
    }

    @PreAuthorize("hasRole('SALES_MANAGER')")
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) RefundStatus status) {
        List<RefundRequestEntity> list = refundService.listAllRefunds(status);
        return ResponseEntity.ok(list);
    }

    @PreAuthorize("hasRole('SALES_MANAGER')")
    @PutMapping("/{id}/decision")
    public ResponseEntity<?> decide(@PathVariable String id,
                                    @RequestBody RefundDecisionRequest req) {
        try {
            RefundRequestEntity rr = refundService.decide(id, req.isApprove(), req.getManagerNote());
            return ResponseEntity.ok(rr);
        } catch (RuntimeException ex) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("message", ex.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @PreAuthorize("hasRole('SALES_MANAGER')")
    @PutMapping("/{id}/refund")
    public ResponseEntity<?> refund(@PathVariable String id) {
        try {
            RefundRequestEntity rr = refundService.markRefunded(id);
            return ResponseEntity.ok(rr);
        } catch (RuntimeException ex) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("message", ex.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
}


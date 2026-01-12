package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.RefundRequestEntity;
import edu.sabanciuniv.cs308.backend.request.RefundCreateRequest;
import edu.sabanciuniv.cs308.backend.service.RefundService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/refunds")
public class RefundController {

    private final RefundService refundService;

    public RefundController(RefundService refundService) {
        this.refundService = refundService;
    }

    // GET /api/refunds?me=true
    @GetMapping
    public ResponseEntity<?> list(Authentication auth,
                                  @RequestParam(required = false, defaultValue = "false") boolean me) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        if (!me) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only me=true is supported for now"));
        }

        String email = auth.getName();
        List<RefundRequestEntity> list = refundService.listMyRefundRequests(email);
        return ResponseEntity.ok(list);
    }

    // POST /api/refunds
    @PostMapping
    public ResponseEntity<?> create(Authentication auth,
                                    @RequestBody RefundCreateRequest req) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        String email = auth.getName();

        try {
            RefundRequestEntity rr = refundService.createRefundRequest(email, req);
            return ResponseEntity.status(201).body(rr);
        } catch (RuntimeException ex) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("message", ex.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
}

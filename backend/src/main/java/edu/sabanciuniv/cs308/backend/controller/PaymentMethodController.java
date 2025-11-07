/* package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.PaymentMethod;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import edu.sabanciuniv.cs308.backend.request.NewPaymentMethodRequest;
import edu.sabanciuniv.cs308.backend.request.UpdatePaymentMethodRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/payment-methods")
public class PaymentMethodController {

    private final UserRepository userRepo;

    public PaymentMethodController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        UserEntity u = ensureUser(auth);
        return ResponseEntity.ok(u.getPaymentMethods());
    }

    @PostMapping
    public ResponseEntity<?> add(Authentication auth, @RequestBody NewPaymentMethodRequest req) {
        UserEntity u = ensureUser(auth);

        PaymentMethod pm = new PaymentMethod();
        pm.setId(UUID.randomUUID().toString());
        pm.setBrand(req.getBrand());
        pm.setLast4(req.getLast4());
        pm.setExpMonth(req.getExpMonth());
        pm.setExpYear(req.getExpYear());
        pm.setHolderName(req.getHolderName());
        pm.setToken(req.getToken());
        pm.setNickname(req.getNickname());
        pm.setIsDefault(req.isDefault());

        if (req.isDefault()) {
            for (PaymentMethod x : u.getPaymentMethods()) x.setIsDefault(false);
        }
        u.getPaymentMethods().add(pm);
        userRepo.save(u);

        return ResponseEntity.status(201).body(pm);
    }

    @PutMapping("/{pmId}")
    public ResponseEntity<?> update(Authentication auth,
                                    @PathVariable String pmId,
                                    @RequestBody UpdatePaymentMethodRequest req) {
        UserEntity u = ensureUser(auth);
        PaymentMethod pm = u.getPaymentMethods().stream()
                .filter(x -> x.getId().equals(pmId)).findFirst()
                .orElseThrow(() -> new RuntimeException("Payment method not found"));

        if (req.getHolderName() != null) pm.setHolderName(req.getHolderName());
        if (req.getExpMonth() != null) pm.setExpMonth(req.getExpMonth());
        if (req.getExpYear() != null) pm.setExpYear(req.getExpYear());
        if (req.getNickname() != null) pm.setNickname(req.getNickname());
        if (req.getIsDefault() != null && req.getIsDefault()) {
            for (PaymentMethod x : u.getPaymentMethods()) x.setIsDefault(false);
            pm.setIsDefault(true);
        }

        userRepo.save(u);
        return ResponseEntity.ok(pm);
    }

    @DeleteMapping("/{pmId}")
    public ResponseEntity<?> delete(Authentication auth, @PathVariable String pmId) {
        UserEntity u = ensureUser(auth);
        boolean removed = u.getPaymentMethods().removeIf(x -> x.getId().equals(pmId));
        if (!removed) return ResponseEntity.status(404).body(Map.of("message", "Not found"));
        userRepo.save(u);
        return ResponseEntity.noContent().build();
    }

    private UserEntity ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            throw new RuntimeException("Unauthorized");
        String email = auth.getName();
        return userRepo.findByEmailAddress(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
} */
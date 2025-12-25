package edu.sabanciuniv.cs308.backend.config;

import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.enums.UserRole;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BackofficeUserSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public BackofficeUserSeeder(UserRepository userRepository,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedIfMissing("sales@demo.com", "Sales123!", UserRole.SALES_MANAGER, "Sales Manager");
        seedIfMissing("pm@demo.com", "Pm123!", UserRole.PRODUCT_MANAGER, "Product Manager");
        seedIfMissing("support@demo.com", "Support123!", UserRole.SUPPORT_AGENT, "Support Agent");
    }

    private void seedIfMissing(String email, String rawPassword, UserRole role, String name) {
        if (userRepository.findByEmailAddress(email).isPresent()) return;

        UserEntity u = new UserEntity();
        u.setEmailAddress(email);
        u.setPassword(passwordEncoder.encode(rawPassword));
        u.setRole(role);

        // zorunlu alanların varsa burada set edeceğiz:
        u.setName(name);
        // u.setHomeAddress("...");
        // u.setTaxId("...");

        userRepository.save(u);

        System.out.println("[SEED] Created backoffice user: " + email + " (" + role + ")");
    }
}
package edu.sabanciuniv.cs308.backend.config;

import edu.sabanciuniv.cs308.backend.service.CustomUserDetailsService;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService customUserDetailsService;

    public SecurityConfig(CustomUserDetailsService customUserDetailsService) {
        this.customUserDetailsService = customUserDetailsService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> {})
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth

                        // public
                        .requestMatchers(
                                "/api/auth/signup",
                                "/api/auth/login",
                                "/api/auth/logout",
                                "/error"
                        ).permitAll()



                        .requestMatchers("/api/users/me").authenticated()

                        // allow PM/Admin to resolve user ids
                        .requestMatchers("GET", "/api/users/resolve").hasAnyRole("PRODUCT_MANAGER", "ADMIN")
                        .requestMatchers("GET", "/api/users/*").hasAnyRole("PRODUCT_MANAGER", "ADMIN")


                        // ---- REVIEWS ----
                        .requestMatchers("GET", "/api/reviews/product/**").permitAll()

                        .requestMatchers(
                                "/api/reviews/pending",
                                "/api/reviews/*/approve",
                                "/api/reviews/*/reject"
                        ).hasRole("PRODUCT_MANAGER")

                        .requestMatchers("POST", "/api/reviews").hasRole("CUSTOMER")

                        // customer-only endpoints (keep these)
                        // customer-only endpoints (keep these)
                        .requestMatchers(
                                "/api/account/**",
                                "/api/orders/**",
                                "/api/returns/**",
                                "/api/refunds/**",
                                "/api/checkout/**",
                                "/api/users/me/payment-methods/**"
                        ).hasRole("CUSTOMER")

                        // backoffice endpoints
                        .requestMatchers("/api/admin/product/**")
                        .hasAnyRole("PRODUCT_MANAGER", "SALES_MANAGER")
                        .requestMatchers("/api/admin/sales/**").hasRole("SALES_MANAGER")
                        .requestMatchers("/api/admin/refunds/**").hasRole("SALES_MANAGER")
                        .requestMatchers("/api/admin/support/**").hasRole("SUPPORT_AGENT")

                        // anything else under /api/admin requires login at least
                        .requestMatchers("/api/admin/**").authenticated()

                        // everything else
                        .anyRequest().permitAll()
                )
                .authenticationProvider(authenticationProvider())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.ALWAYS))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler((req, res, auth) -> res.setStatus(200))
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
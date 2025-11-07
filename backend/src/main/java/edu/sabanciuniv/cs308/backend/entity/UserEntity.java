package edu.sabanciuniv.cs308.backend.entity;

import edu.sabanciuniv.cs308.backend.enums.UserRole;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "users")
public class UserEntity {

    @Id
    private String id;

    private String name;

    @Field("email")
    @Indexed(name = "email_1", unique = true)
    private String emailAddress;

    private String homeAddress;

    private String password;

    private UserRole role;

    // optional extra data
    private List<Address> addresses = new ArrayList<>();

    private String phoneNumber;

    // payment methods user saved
    private List<PaymentMethod> paymentMethods = new ArrayList<>();

    // ---------- inner helper classes (same idea as old code) ----------
    public static class Address {
        private String id;
        private String label;
        private String fullName;
        private String line1;
        private String line2;
        private String city;
        private String state;
        private String country;
        private String zipCode;
        private boolean isDefault;
        private String phoneNumber;

        // getters/setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getLine1() { return line1; }
        public void setLine1(String line1) { this.line1 = line1; }
        public String getLine2() { return line2; }
        public void setLine2(String line2) { this.line2 = line2; }
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public String getState() { return state; }
        public void setState(String state) { this.state = state; }
        public String getCountry() { return country; }
        public void setCountry(String country) { this.country = country; }
        public String getZipCode() { return zipCode; }
        public void setZipCode(String zipCode) { this.zipCode = zipCode; }
        public boolean isDefault() { return isDefault; }
        public void setDefault(boolean aDefault) { isDefault = aDefault; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    }

    public static class PaymentMethod {
        private String id;
        private String brand;
        private String last4;
        private Integer expMonth;
        private Integer expYear;
        private String holderName;
        private boolean isDefault;
        private String token;
        private String nickname;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getBrand() { return brand; }
        public void setBrand(String brand) { this.brand = brand; }
        public String getLast4() { return last4; }
        public void setLast4(String last4) { this.last4 = last4; }
        public Integer getExpMonth() { return expMonth; }
        public void setExpMonth(Integer expMonth) { this.expMonth = expMonth; }
        public Integer getExpYear() { return expYear; }
        public void setExpYear(Integer expYear) { this.expYear = expYear; }
        public String getHolderName() { return holderName; }
        public void setHolderName(String holderName) { this.holderName = holderName; }
        public boolean isDefault() { return isDefault; }
        public void setDefault(boolean aDefault) { isDefault = aDefault; }
        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public String getNickname() { return nickname; }
        public void setNickname(String nickname) { this.nickname = nickname; }
    }
}
package edu.sabanciuniv.cs308.backend.request;

public class NewPaymentMethodRequest {
    private String brand;
    private String last4;
    private int expMonth;
    private int expYear;
    private String holderName;
    private boolean isDefault;
    private String token;
    private String nickname;

    // getters & setters...

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getLast4() { return last4; }
    public void setLast4(String last4) { this.last4 = last4; }

    public int getExpMonth() { return expMonth; }
    public void setExpMonth(int expMonth) { this.expMonth = expMonth; }

    public int getExpYear() { return expYear; }
    public void setExpYear(int expYear) { this.expYear = expYear; }

    public String getHolderName() { return holderName; }
    public void setHolderName(String holderName) { this.holderName = holderName; }

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean aDefault) { isDefault = aDefault; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}
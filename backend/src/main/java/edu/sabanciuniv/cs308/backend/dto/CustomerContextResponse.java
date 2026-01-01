package edu.sabanciuniv.cs308.backend.dto;

import edu.sabanciuniv.cs308.backend.dto.UserDTO;

import java.util.List;

public class CustomerContextResponse {
    private boolean loggedIn;
    private UserDTO user;               // profil
    private Object cart;                // projendeki cart modeline bağlayacağız
    private List<Object> orders;        // projendeki order DTO/entity
    private List<Object> wishlist;      // projendeki wishlist modeli

    public boolean isLoggedIn() { return loggedIn; }
    public void setLoggedIn(boolean loggedIn) { this.loggedIn = loggedIn; }

    public UserDTO getUser() { return user; }
    public void setUser(UserDTO user) { this.user = user; }

    public Object getCart() { return cart; }
    public void setCart(Object cart) { this.cart = cart; }

    public List<Object> getOrders() { return orders; }
    public void setOrders(List<Object> orders) { this.orders = orders; }

    public List<Object> getWishlist() { return wishlist; }
    public void setWishlist(List<Object> wishlist) { this.wishlist = wishlist; }
}
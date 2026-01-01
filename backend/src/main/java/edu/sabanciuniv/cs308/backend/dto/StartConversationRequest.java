package edu.sabanciuniv.cs308.backend.dto;

public class StartConversationRequest {
    // Guest başlatmak isterse client optional gönderir (göndermese server sessionId kullanır)
    private String guestSessionId;

    public String getGuestSessionId() { return guestSessionId; }
    public void setGuestSessionId(String guestSessionId) { this.guestSessionId = guestSessionId; }
}
package edu.sabanciuniv.cs308.backend.dto;

import edu.sabanciuniv.cs308.backend.enums.ConversationStatus;

import java.time.Instant;

public class ConversationSummaryResponse {
    private String id;
    private ConversationStatus status;
    private String assignedAgentId;

    private String userId;
    private String userEmail;
    private String guestSessionId;

    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public ConversationStatus getStatus() { return status; }
    public void setStatus(ConversationStatus status) { this.status = status; }

    public String getAssignedAgentId() { return assignedAgentId; }
    public void setAssignedAgentId(String assignedAgentId) { this.assignedAgentId = assignedAgentId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getGuestSessionId() { return guestSessionId; }
    public void setGuestSessionId(String guestSessionId) { this.guestSessionId = guestSessionId; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
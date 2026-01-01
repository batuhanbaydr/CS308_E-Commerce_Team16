package edu.sabanciuniv.cs308.backend.dto;

public class StartConversationResponse {
    private String conversationId;

    public StartConversationResponse() {}
    public StartConversationResponse(String conversationId) { this.conversationId = conversationId; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
}
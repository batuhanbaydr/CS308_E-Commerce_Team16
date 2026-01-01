package edu.sabanciuniv.cs308.backend.dto;

public class ChatMessageEvent {

    private String messageId;
    private String conversationId;

    private String senderType;      // "CUSTOMER" / "AGENT"
    private String senderPrincipal; // "user:..." veya "guest:..."

    private String text;
    private String attachmentUrl;
    private long timestamp;

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getSenderType() { return senderType; }
    public void setSenderType(String senderType) { this.senderType = senderType; }

    public String getSenderPrincipal() { return senderPrincipal; }
    public void setSenderPrincipal(String senderPrincipal) { this.senderPrincipal = senderPrincipal; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
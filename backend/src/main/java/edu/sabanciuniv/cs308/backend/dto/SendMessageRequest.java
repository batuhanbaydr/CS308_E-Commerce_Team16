package edu.sabanciuniv.cs308.backend.dto;

import edu.sabanciuniv.cs308.backend.enums.MessageSenderType;

public class SendMessageRequest {

    private String conversationId;
    private String text;
    private String attachmentUrl; // file upload sonrası oluşan URL
    private MessageSenderType senderType; // CUSTOMER / AGENT

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public MessageSenderType getSenderType() { return senderType; }
    public void setSenderType(MessageSenderType senderType) { this.senderType = senderType; }
}
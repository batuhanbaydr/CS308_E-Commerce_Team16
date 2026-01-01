package edu.sabanciuniv.cs308.backend.entity;

import edu.sabanciuniv.cs308.backend.enums.MessageSenderType;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "messages")
public class MessageEntity {

    @Id
    private String id;

    private String conversationId;

    private MessageSenderType senderType;     // CUSTOMER / AGENT
    private String senderPrincipal;           // "user:..." / "guest:..."

    private String text;
    private String attachmentUrl;

    private Instant timestamp;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public MessageSenderType getSenderType() { return senderType; }
    public void setSenderType(MessageSenderType senderType) { this.senderType = senderType; }

    public String getSenderPrincipal() { return senderPrincipal; }
    public void setSenderPrincipal(String senderPrincipal) { this.senderPrincipal = senderPrincipal; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.ChatMessageEvent;
import edu.sabanciuniv.cs308.backend.entity.ConversationEntity;
import edu.sabanciuniv.cs308.backend.entity.MessageEntity;
import edu.sabanciuniv.cs308.backend.enums.ConversationStatus;
import edu.sabanciuniv.cs308.backend.enums.MessageSenderType;
import edu.sabanciuniv.cs308.backend.repository.ConversationRepository;
import edu.sabanciuniv.cs308.backend.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    public ConversationEntity startConversation(String userId, String userEmail, String guestSessionId) {
        ConversationEntity c = new ConversationEntity();
        c.setUserId(userId);
        c.setUserEmail(userEmail);
        c.setGuestSessionId(guestSessionId);

        c.setStatus(ConversationStatus.OPEN);
        c.setAssignedAgentId(null);

        Instant now = Instant.now();
        c.setCreatedAt(now);
        c.setUpdatedAt(now);

        return conversationRepository.save(c);
    }

    public ChatMessageEvent saveMessageAndBuildEvent(String conversationId,
                                                     String text,
                                                     String attachmentUrl,
                                                     MessageSenderType senderType,
                                                     String senderPrincipal) {

        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + conversationId));

        MessageEntity m = new MessageEntity();
        m.setConversationId(conversationId);
        m.setSenderType(senderType);
        m.setSenderPrincipal(senderPrincipal);
        m.setText(text);
        m.setAttachmentUrl(attachmentUrl);
        m.setTimestamp(Instant.now());
        m = messageRepository.save(m);

        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);

        ChatMessageEvent ev = new ChatMessageEvent();
        ev.setMessageId(m.getId());
        ev.setConversationId(conversationId);
        ev.setSenderType(senderType.name());
        ev.setSenderPrincipal(senderPrincipal);
        ev.setText(text);
        ev.setAttachmentUrl(attachmentUrl);
        ev.setTimestamp(m.getTimestamp().toEpochMilli());
        return ev;
    }

    public List<MessageEntity> getMessages(String conversationId) {
        return messageRepository.findByConversationIdOrderByTimestampAsc(conversationId);
    }

    public List<ConversationEntity> getActiveConversations() {
        return conversationRepository.findByStatusInOrderByUpdatedAtDesc(
                List.of(ConversationStatus.OPEN, ConversationStatus.CLAIMED)
        );
    }

    public ConversationEntity claimConversation(String conversationId, String agentUserId) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + conversationId));

        if (conv.getStatus() == ConversationStatus.CLOSED) {
            throw new RuntimeException("Conversation is closed");
        }

        if (conv.getAssignedAgentId() == null) {
            conv.setAssignedAgentId(agentUserId);
            conv.setStatus(ConversationStatus.CLAIMED);
            conv.setUpdatedAt(Instant.now());
            return conversationRepository.save(conv);
        }

        return conv;
    }

    public ConversationEntity getConversation(String conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + conversationId));
    }
}
package edu.sabanciuniv.cs308.backend.service;

import edu.sabanciuniv.cs308.backend.dto.ChatMessageEvent;
import edu.sabanciuniv.cs308.backend.entity.ConversationEntity;
import edu.sabanciuniv.cs308.backend.entity.MessageEntity;
import edu.sabanciuniv.cs308.backend.enums.ConversationStatus;
import edu.sabanciuniv.cs308.backend.enums.MessageSenderType;
import edu.sabanciuniv.cs308.backend.repository.ConversationRepository;
import edu.sabanciuniv.cs308.backend.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatServiceTest {

    private ConversationRepository conversationRepository;
    private MessageRepository messageRepository;
    private ChatService chatService;

    @BeforeEach
    void setUp() {
        conversationRepository = mock(ConversationRepository.class);
        messageRepository = mock(MessageRepository.class);
        chatService = new ChatService(conversationRepository, messageRepository);
    }

    @Test
    void startConversation_shouldCreateOpenConversation_withTimestamps() {
        // arrange
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // act
        ConversationEntity c = chatService.startConversation(null, null, "guest-session-1");

        // assert
        assertNotNull(c);
        assertEquals("guest-session-1", c.getGuestSessionId());
        assertEquals(ConversationStatus.OPEN, c.getStatus());
        assertNull(c.getAssignedAgentId());
        assertNotNull(c.getCreatedAt());
        assertNotNull(c.getUpdatedAt());

        verify(conversationRepository, times(1)).save(any(ConversationEntity.class));
        verifyNoInteractions(messageRepository);
    }

    @Test
    void claimConversation_whenUnassigned_shouldAssignAndSetClaimed() {
        // arrange
        ConversationEntity existing = new ConversationEntity();
        existing.setId("c1");
        existing.setStatus(ConversationStatus.OPEN);
        existing.setAssignedAgentId(null);
        existing.setUpdatedAt(Instant.now());

        when(conversationRepository.findById("c1")).thenReturn(Optional.of(existing));
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // act
        ConversationEntity updated = chatService.claimConversation("c1", "agent@email.com");

        // assert
        assertEquals(ConversationStatus.CLAIMED, updated.getStatus());
        assertEquals("agent@email.com", updated.getAssignedAgentId());
        assertNotNull(updated.getUpdatedAt());

        verify(conversationRepository).findById("c1");
        verify(conversationRepository).save(any(ConversationEntity.class));
        verifyNoInteractions(messageRepository);
    }

    @Test
    void saveMessageAndBuildEvent_shouldPersistMessage_andUpdateConversationUpdatedAt() {
        // arrange
        ConversationEntity conv = new ConversationEntity();
        conv.setId("c1");
        conv.setStatus(ConversationStatus.OPEN);
        conv.setUpdatedAt(Instant.now());

        when(conversationRepository.findById("c1")).thenReturn(Optional.of(conv));

        when(messageRepository.save(any(MessageEntity.class))).thenAnswer(invocation -> {
            MessageEntity m = invocation.getArgument(0);
            m.setId("m1");
            return m;
        });

        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // act
        ChatMessageEvent ev = chatService.saveMessageAndBuildEvent(
                "c1",
                "hello",
                null,
                MessageSenderType.CUSTOMER,
                "guest:abc"
        );

        // assert event
        assertNotNull(ev);
        assertEquals("m1", ev.getMessageId());
        assertEquals("c1", ev.getConversationId());
        assertEquals("CUSTOMER", ev.getSenderType());
        assertEquals("guest:abc", ev.getSenderPrincipal());
        assertEquals("hello", ev.getText());
        assertNull(ev.getAttachmentUrl());
        assertTrue(ev.getTimestamp() > 0);

        // verify message saved with correct fields
        ArgumentCaptor<MessageEntity> msgCaptor = ArgumentCaptor.forClass(MessageEntity.class);
        verify(messageRepository, times(1)).save(msgCaptor.capture());
        MessageEntity savedMsg = msgCaptor.getValue();

        assertEquals("c1", savedMsg.getConversationId());
        assertEquals(MessageSenderType.CUSTOMER, savedMsg.getSenderType());
        assertEquals("guest:abc", savedMsg.getSenderPrincipal());
        assertEquals("hello", savedMsg.getText());

        // verify conversation updatedAt saved (your implementation saves once)
        ArgumentCaptor<ConversationEntity> convCaptor = ArgumentCaptor.forClass(ConversationEntity.class);
        verify(conversationRepository, times(1)).save(convCaptor.capture());
        ConversationEntity savedConv = convCaptor.getValue();
        assertNotNull(savedConv.getUpdatedAt());

        // also ensure we loaded conversation
        verify(conversationRepository, times(1)).findById("c1");
    }
}
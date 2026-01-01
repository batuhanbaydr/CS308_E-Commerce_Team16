package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.entity.ConversationEntity;
import edu.sabanciuniv.cs308.backend.enums.ConversationStatus;
import edu.sabanciuniv.cs308.backend.service.ChatAttachmentService;
import edu.sabanciuniv.cs308.backend.service.ChatService;
import edu.sabanciuniv.cs308.backend.service.CustomerContextService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatRestControllerTest {

    @Test
    void claim_withoutAuth_shouldReturn401() {
        ChatService chatService = mock(ChatService.class);
        CustomerContextService customerContextService = mock(CustomerContextService.class);
        ChatAttachmentService attachmentService = mock(ChatAttachmentService.class);

        ChatRestController controller =
                new ChatRestController(chatService, customerContextService, attachmentService);

        ResponseEntity<?> res = controller.claim("c1", null);

        assertEquals(401, res.getStatusCode().value());
        assertNotNull(res.getBody());

        Map<?, ?> body = (Map<?, ?>) res.getBody();
        assertTrue(body.containsKey("message"));

        verifyNoInteractions(chatService);
    }

    @Test
    void claim_withAuth_shouldAssignConversation() {
        ChatService chatService = mock(ChatService.class);
        CustomerContextService customerContextService = mock(CustomerContextService.class);
        ChatAttachmentService attachmentService = mock(ChatAttachmentService.class);

        ChatRestController controller =
                new ChatRestController(chatService, customerContextService, attachmentService);

        ConversationEntity updated = new ConversationEntity();
        updated.setId("c1");
        updated.setStatus(ConversationStatus.CLAIMED);
        updated.setAssignedAgentId("agent@email.com");
        updated.setUpdatedAt(Instant.now());

        when(chatService.claimConversation("c1", "agent@email.com")).thenReturn(updated);

        Authentication auth = new TestingAuthenticationToken("agent@email.com", "pw");
        ((TestingAuthenticationToken) auth).setAuthenticated(true);

        ResponseEntity<?> res = controller.claim("c1", auth);

        assertEquals(200, res.getStatusCode().value());
        assertNotNull(res.getBody());

        Map<?, ?> body = (Map<?, ?>) res.getBody();
        assertEquals("c1", body.get("conversationId"));
        assertEquals("CLAIMED", body.get("status"));
        assertEquals("agent@email.com", body.get("assignedAgentId"));

        verify(chatService).claimConversation("c1", "agent@email.com");
    }
}
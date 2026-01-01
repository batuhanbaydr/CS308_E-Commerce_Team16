package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.ChatMessageEvent;
import edu.sabanciuniv.cs308.backend.dto.SendMessageRequest;
import edu.sabanciuniv.cs308.backend.enums.MessageSenderType;
import edu.sabanciuniv.cs308.backend.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatWsController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWsController(ChatService chatService,
                            SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Client SEND:
     *   destination: /app/chat.send
     * body:
     *   { "conversationId": "...", "text": "...", "senderType": "CUSTOMER" }
     *
     * Client SUBSCRIBE:
     *   /topic/conversations/{conversationId}
     */
    @MessageMapping("/chat.send")
    public void sendMessage(SendMessageRequest req, Principal principal) {

        // Güvenlik: principal null olabilir (guest)
        String principalName = (principal != null ? principal.getName() : "guest:unknown");

        // DB'ye kaydet + event oluştur
        ChatMessageEvent event = chatService.saveMessageAndBuildEvent(
                req.getConversationId(),
                req.getText(),
                req.getAttachmentUrl(),
                req.getSenderType() == null ? MessageSenderType.CUSTOMER : req.getSenderType(),
                principalName
        );

        // Conversation kanalına yayınla
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + req.getConversationId(),
                event
        );

        // İstersen agent queue güncellemesi için broadcast (opsiyonel):
        // messagingTemplate.convertAndSend("/topic/support.queue", Map.of("type","REFRESH"));
    }
}
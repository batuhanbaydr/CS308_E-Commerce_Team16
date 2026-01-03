package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.*;
import edu.sabanciuniv.cs308.backend.entity.ConversationEntity;
import edu.sabanciuniv.cs308.backend.entity.MessageEntity;
import edu.sabanciuniv.cs308.backend.service.ChatAttachmentService;
import edu.sabanciuniv.cs308.backend.service.ChatService;
import edu.sabanciuniv.cs308.backend.service.CustomerContextService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    private final ChatService chatService;
    private final CustomerContextService customerContextService;
    private final ChatAttachmentService chatAttachmentService;

    public ChatRestController(ChatService chatService,
                              CustomerContextService customerContextService,
                              ChatAttachmentService chatAttachmentService) {
        this.chatService = chatService;
        this.customerContextService = customerContextService;
        this.chatAttachmentService = chatAttachmentService;
    }

    // 1) Customer/guest conversation başlatır
    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestBody(required = false) StartConversationRequest body,
                                   Authentication auth,
                                   HttpSession session) {

        String guestSessionId = (body != null && body.getGuestSessionId() != null)
                ? body.getGuestSessionId()
                : (session != null ? session.getId() : null);

        String userId = null;
        String userEmail = null;

        if (auth != null && auth.isAuthenticated()) {
            userEmail = auth.getName();
            // userId'yi WS interceptor zaten buluyordu; REST tarafında opsiyonel:
            // Eğer istersen burada userRepository ile bulursun. Şimdilik null bırakıyoruz.
        }

        ConversationEntity c = chatService.startConversation(userId, userEmail, guestSessionId);
        return ResponseEntity.ok(new StartConversationResponse(c.getId()));
    }

    // 2) Agent queue: aktif konuşmalar
    @GetMapping("/active")
    public ResponseEntity<?> active() {
        List<ConversationEntity> list = chatService.getActiveConversations();
        List<ConversationSummaryResponse> resp = list.stream().map(c -> {
            ConversationSummaryResponse s = new ConversationSummaryResponse();
            s.setId(c.getId());
            s.setStatus(c.getStatus());
            s.setAssignedAgentId(c.getAssignedAgentId());
            s.setUserId(c.getUserId());
            s.setUserEmail(c.getUserEmail());
            s.setGuestSessionId(c.getGuestSessionId());
            s.setUpdatedAt(c.getUpdatedAt());
            return s;
        }).toList();
        return ResponseEntity.ok(resp);
    }

    // 3) Agent claim
    @PostMapping("/{conversationId}/claim")
    public ResponseEntity<?> claim(@PathVariable String conversationId,
                                   Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        // agentUserId olarak email kullanıyoruz (senin auth.getName() email)
        String agentUserId = auth.getName();

        ConversationEntity updated = chatService.claimConversation(conversationId, agentUserId);
        return ResponseEntity.ok(Map.of(
                "conversationId", updated.getId(),
                "status", updated.getStatus().name(),
                "assignedAgentId", updated.getAssignedAgentId()
        ));
    }

    // 4) Mesaj geçmişi
    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<?> messages(@PathVariable String conversationId) {
        List<MessageEntity> messages = chatService.getMessages(conversationId);
        return ResponseEntity.ok(messages);
    }

    // 5) Context (logged-in userId varsa)
    @GetMapping("/{conversationId}/context")
    public ResponseEntity<?> context(@PathVariable String conversationId) {
        ConversationEntity c = chatService.getConversation(conversationId);
        CustomerContextResponse ctx = customerContextService.buildContextByUserId(c.getUserId());
        return ResponseEntity.ok(ctx);
    }

    // 6) Attachment upload
    @PostMapping("/{conversationId}/attachment")
    public ResponseEntity<?> upload(@PathVariable String conversationId,
                                    @RequestParam("file") MultipartFile file) throws Exception {
        // conversation var mı kontrol edelim:
        chatService.getConversation(conversationId);

        String url = chatAttachmentService.save(file);
        return ResponseEntity.ok(Map.of("attachmentUrl", url));
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Path path = chatAttachmentService.resolve(filename);
        Resource resource = new UrlResource(path.toUri());

        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        // detect MIME type from file
        String contentType = Files.probeContentType(path);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(
                    HttpHeaders.CONTENT_DISPOSITION,
                    "inline; filename=\"" + resource.getFilename() + "\""
                )
                .body(resource);
    }
}
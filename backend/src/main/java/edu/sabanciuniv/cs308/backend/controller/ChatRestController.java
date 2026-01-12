package edu.sabanciuniv.cs308.backend.controller;

import edu.sabanciuniv.cs308.backend.dto.*;
import edu.sabanciuniv.cs308.backend.entity.ConversationEntity;
import edu.sabanciuniv.cs308.backend.entity.MessageEntity;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import edu.sabanciuniv.cs308.backend.repository.UserRepository;
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

    // ✅ add
    private final UserRepository userRepository;

    public ChatRestController(ChatService chatService,
                              CustomerContextService customerContextService,
                              ChatAttachmentService chatAttachmentService,
                              UserRepository userRepository) {
        this.chatService = chatService;
        this.customerContextService = customerContextService;
        this.chatAttachmentService = chatAttachmentService;
        this.userRepository = userRepository;
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

        // ✅ FIX: logged-in ise userId’yi de bul
        if (auth != null && auth.isAuthenticated()) {
            userEmail = auth.getName(); // email
            userId = userRepository.findByEmailAddress(userEmail)
                    .map(UserEntity::getId)
                    .orElse(null);
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

        String agentUserId = auth.getName(); // email
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

    // 5) Context (cart/orders userId ile, wishlist email ile)
    @GetMapping("/{conversationId}/context")
    public ResponseEntity<?> context(@PathVariable String conversationId) {
        ConversationEntity c = chatService.getConversation(conversationId);

        CustomerContextResponse ctx = customerContextService.buildContext(
                c.getUserId(),
                c.getUserEmail()
        );

        return ResponseEntity.ok(ctx);
    }

    // 6) Attachment upload
    @PostMapping("/{conversationId}/attachment")
    public ResponseEntity<?> upload(@PathVariable String conversationId,
                                    @RequestParam("file") MultipartFile file) throws Exception {
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

        String contentType = Files.probeContentType(path);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}

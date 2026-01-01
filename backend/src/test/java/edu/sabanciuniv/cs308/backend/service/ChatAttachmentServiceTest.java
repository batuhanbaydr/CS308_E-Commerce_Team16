package edu.sabanciuniv.cs308.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

class ChatAttachmentServiceTest {

    @Test
    void save_shouldReturnFilesUrl_andCreateFile() throws Exception {
        ChatAttachmentService service = new ChatAttachmentService();

        // uploadDir'i test için geçici bir klasöre çekelim
        setField(service, "uploadDir", "build/test-uploads");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.jpeg",
                "image/jpeg",
                "dummy-image-content".getBytes()
        );

        String url = service.save(file);

        assertNotNull(url);
        assertTrue(url.startsWith("/api/chat/files/"));
        assertTrue(url.endsWith(".jpeg") || url.endsWith(".jpg") || url.contains("."));
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }
}
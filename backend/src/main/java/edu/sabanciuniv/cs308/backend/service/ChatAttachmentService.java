package edu.sabanciuniv.cs308.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class ChatAttachmentService {

    @Value("${chat.upload-dir:uploads/chat}")
    private String uploadDir;

    public String save(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is empty");
        }

        String original = file.getOriginalFilename();
        String ext = StringUtils.getFilenameExtension(original);
        String safeName = UUID.randomUUID() + (ext != null ? ("." + ext) : "");

        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        Path target = dir.resolve(safeName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        // Bu URL'i controller'da serve edeceğiz:
        return "/api/chat/files/" + safeName;
    }

    public Path resolve(String filename) {
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        return dir.resolve(filename).normalize();
    }
}
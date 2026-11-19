package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.UserResponse;
import com.marketforge.entity.User;
import com.marketforge.exception.BusinessException;
import com.marketforge.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
public class FileUploadController {

    private final AuthService authService;

    @Value("${storage.upload-dir:./uploads}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif");

    // FIX #6: Magic byte signatures for allowed image types.
    // Content-Type and file extension can be spoofed; magic bytes cannot.
    private static final byte[] MAGIC_JPG   = new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF};
    private static final byte[] MAGIC_PNG   = new byte[]{(byte)0x89, 0x50, 0x4E, 0x47};
    private static final byte[] MAGIC_GIF   = new byte[]{0x47, 0x49, 0x46, 0x38};          // GIF8
    private static final byte[] MAGIC_WEBP1 = new byte[]{0x52, 0x49, 0x46, 0x46};          // RIFF (then 4 bytes size, then WEBP)

    /**
     * Upload an avatar image, save it locally, and update current user's profile.
     */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {

        validateImage(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "avatar.png");
        String extension = getFileExtension(originalFilename);
        String uniqueFilename = "avatar_" + currentUser.getId() + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;

        try {
            Path targetDir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            Files.createDirectories(targetDir);

            Path targetFile = targetDir.resolve(uniqueFilename);
            // Path traversal guard: reject if resolved path escapes the target directory
            if (!targetFile.startsWith(targetDir)) {
                throw new BusinessException("INVALID_FILENAME", "Invalid file name");
            }

            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);

            String relativeUrl = "/uploads/avatars/" + uniqueFilename;
            UserResponse updatedUser = authService.updateAvatar(currentUser, relativeUrl);

            log.info("Avatar uploaded successfully for user {}: {}", currentUser.getId(), relativeUrl);

            return ResponseEntity.ok(ApiResponse.success("Avatar uploaded successfully", Map.of(
                    "url", relativeUrl,
                    "user", updatedUser
            )));
        } catch (IOException e) {
            log.error("Failed to store uploaded avatar", e);
            throw new BusinessException("UPLOAD_FAILED", "Failed to store uploaded file: " + e.getMessage());
        }
    }

    /**
     * Upload a generic image (for listings, attachments, etc.)
     */
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadGeneralImage(
            @RequestParam("file") MultipartFile file) {

        validateImage(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.png");
        String extension = getFileExtension(originalFilename);
        String uniqueFilename = "img_" + UUID.randomUUID().toString() + extension;

        try {
            Path targetDir = Paths.get(uploadDir, "images").toAbsolutePath().normalize();
            Files.createDirectories(targetDir);

            Path targetFile = targetDir.resolve(uniqueFilename);
            if (!targetFile.startsWith(targetDir)) {
                throw new BusinessException("INVALID_FILENAME", "Invalid file name");
            }

            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);

            String relativeUrl = "/uploads/images/" + uniqueFilename;
            return ResponseEntity.ok(ApiResponse.success("Image uploaded successfully", Map.of(
                    "url", relativeUrl
            )));
        } catch (IOException e) {
            log.error("Failed to store uploaded image", e);
            throw new BusinessException("UPLOAD_FAILED", "Failed to store uploaded file: " + e.getMessage());
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "Please select a file to upload");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("FILE_TOO_LARGE", "File size exceeds the 5MB limit");
        }

        // Extension check
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        boolean validExt = ALLOWED_EXTENSIONS.stream().anyMatch(originalFilename::endsWith);
        if (!validExt) {
            throw new BusinessException("INVALID_IMAGE_TYPE", "Only JPG, PNG, WEBP, and GIF images are supported");
        }

        // FIX #6: Magic bytes check — verify actual file content, not just the declared MIME type
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(12);
            if (!isValidImageMagicBytes(header)) {
                throw new BusinessException("INVALID_IMAGE_CONTENT",
                        "File content does not match a supported image format (JPG, PNG, WEBP, GIF)");
            }
        } catch (BusinessException be) {
            throw be;
        } catch (IOException e) {
            throw new BusinessException("UPLOAD_VALIDATION_FAILED", "Could not read file for validation");
        }
    }

    /**
     * Checks the first bytes of the file against known image magic bytes.
     * This prevents polyglot files (e.g. a PHP shell with a .jpg extension).
     */
    private boolean isValidImageMagicBytes(byte[] header) {
        if (header == null || header.length < 4) return false;

        // JPEG: FF D8 FF
        if (startsWith(header, MAGIC_JPG)) return true;
        // PNG: 89 50 4E 47
        if (startsWith(header, MAGIC_PNG)) return true;
        // GIF: 47 49 46 38 (GIF8)
        if (startsWith(header, MAGIC_GIF)) return true;
        // WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 (RIFF....WEBP)
        if (header.length >= 12 && startsWith(header, MAGIC_WEBP1)) {
            return header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;
        }

        return false;
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < filename.length() - 1) {
            return filename.substring(dotIndex).toLowerCase();
        }
        return ".png";
    }
}

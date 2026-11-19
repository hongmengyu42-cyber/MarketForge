package com.marketforge.dto.response;

import com.marketforge.entity.DisputeAttachment;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DisputeAttachmentDto {
    private Long id;
    private Long disputeId;
    private Long uploadedById;
    private String uploadedByName;
    private String fileUrl;
    private String fileName;
    private LocalDateTime createdAt;

    public static DisputeAttachmentDto from(DisputeAttachment a) {
        if (a == null) return null;
        return DisputeAttachmentDto.builder()
                .id(a.getId())
                .disputeId(a.getDispute() != null ? a.getDispute().getId() : null)
                .uploadedById(a.getUploadedBy() != null ? a.getUploadedBy().getId() : null)
                .uploadedByName(a.getUploadedBy() != null ? a.getUploadedBy().getName() : null)
                .fileUrl(a.getFileUrl())
                .fileName(a.getFileName())
                .createdAt(a.getCreatedAt())
                .build();
    }
}

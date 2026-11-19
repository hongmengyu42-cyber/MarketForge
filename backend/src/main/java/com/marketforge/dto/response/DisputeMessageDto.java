package com.marketforge.dto.response;

import com.marketforge.entity.DisputeMessage;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DisputeMessageDto {
    private Long id;
    private Long disputeId;
    private Long senderId;
    private String senderName;
    private String senderRole; // "BUYER", "SELLER", "MEDIATOR"
    private String senderAvatar;
    private String body;
    private Boolean isSystemEvent;
    private String attachmentUrl;
    private String attachmentName;
    private LocalDateTime createdAt;

    public static DisputeMessageDto from(DisputeMessage m, Long buyerId, Long sellerId) {
        if (m == null) return null;
        String role = "MEDIATOR";
        if (m.getSender() != null) {
            if (buyerId != null && m.getSender().getId().equals(buyerId)) role = "BUYER";
            else if (sellerId != null && m.getSender().getId().equals(sellerId)) role = "SELLER";
        }
        return DisputeMessageDto.builder()
                .id(m.getId())
                .disputeId(m.getDispute() != null ? m.getDispute().getId() : null)
                .senderId(m.getSender() != null ? m.getSender().getId() : null)
                .senderName(m.getSender() != null ? m.getSender().getName() : "System")
                .senderAvatar(m.getSender() != null ? m.getSender().getAvatarUrl() : null)
                .senderRole(role)
                .body(m.getBody())
                .isSystemEvent(Boolean.TRUE.equals(m.getIsSystemEvent()))
                .attachmentUrl(m.getAttachmentUrl())
                .attachmentName(m.getAttachmentName())
                .createdAt(m.getCreatedAt())
                .build();
    }
}

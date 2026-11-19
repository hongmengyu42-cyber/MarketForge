package com.marketforge.dto.response;

import com.marketforge.entity.EmailLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailLogDto {
    private Long id;
    private String recipientEmail;
    private String recipientName;
    private String subject;
    private String templateType;
    private String htmlBody;
    private String status;
    private Long orderId;
    private LocalDateTime sentAt;

    public static EmailLogDto from(EmailLog log) {
        return EmailLogDto.builder()
                .id(log.getId())
                .recipientEmail(log.getRecipientEmail())
                .recipientName(log.getRecipientName())
                .subject(log.getSubject())
                .templateType(log.getTemplateType())
                .htmlBody(log.getHtmlBody())
                .status(log.getStatus())
                .orderId(log.getOrderId())
                .sentAt(log.getSentAt())
                .build();
    }
}

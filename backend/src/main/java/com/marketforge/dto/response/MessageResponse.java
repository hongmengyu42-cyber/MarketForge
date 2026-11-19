package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MessageResponse {

    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private String body;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
    private Boolean isMine;
}

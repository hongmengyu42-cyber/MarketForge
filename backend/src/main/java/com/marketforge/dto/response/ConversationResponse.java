package com.marketforge.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ConversationResponse {

    private Long id;
    private Long listingId;
    private String listingTitle;
    private String listingSlug;
    private Long listingPrice;
    private String listingImageUrl;

    private Long otherUserId;
    private String otherUserName;
    private String otherUserAvatar;
    private String otherUserRole;

    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unreadCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.marketforge.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypingEventDto {
    private Long conversationId;
    private Long userId;
    private String userName;
    private boolean typing;
}

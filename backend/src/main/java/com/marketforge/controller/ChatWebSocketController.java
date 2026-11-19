package com.marketforge.controller;

import com.marketforge.dto.websocket.TypingEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload TypingEventDto typingEvent, Principal principal) {
        if (typingEvent.getConversationId() != null) {
            String destination = "/topic/conversations/" + typingEvent.getConversationId() + "/typing";
            messagingTemplate.convertAndSend(destination, typingEvent);
        }
    }
}

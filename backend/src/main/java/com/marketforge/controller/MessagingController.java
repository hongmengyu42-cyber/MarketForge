package com.marketforge.controller;

import com.marketforge.dto.request.CreateCustomOfferRequest;
import com.marketforge.dto.request.SendMessageRequest;
import com.marketforge.dto.request.StartConversationRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.ConversationResponse;
import com.marketforge.dto.response.CustomOfferResponse;
import com.marketforge.dto.response.MessageResponse;
import com.marketforge.entity.User;
import com.marketforge.service.MessagingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/messaging")
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getConversations(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success(messagingService.getConversations(currentUser)));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getMessages(
            @AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(messagingService.getMessages(currentUser, id)));
    }

    @PostMapping("/conversations")
    public ResponseEntity<ApiResponse<ConversationResponse>> startConversation(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody StartConversationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Conversation started", messagingService.startConversation(currentUser, request)));
    }

    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(messagingService.sendMessage(currentUser, request)));
    }

    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAsRead(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        int marked = messagingService.markAsRead(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("Marked as read", Map.of("markedCount", marked)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal User currentUser) {
        long count = messagingService.getUnreadCount(currentUser);
        return ResponseEntity.ok(ApiResponse.success(Map.of("totalUnread", count)));
    }

    @PostMapping("/conversations/{id}/offers")
    public ResponseEntity<ApiResponse<CustomOfferResponse>> createCustomOffer(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody CreateCustomOfferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Custom offer created", messagingService.createCustomOffer(currentUser, id, request)));
    }

    @GetMapping("/conversations/{id}/offers")
    public ResponseEntity<ApiResponse<List<CustomOfferResponse>>> getCustomOffers(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(messagingService.getCustomOffers(currentUser, id)));
    }

    @PostMapping("/offers/{id}/accept")
    public ResponseEntity<ApiResponse<CustomOfferResponse>> acceptCustomOffer(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Custom offer accepted! Order created.", messagingService.acceptCustomOffer(currentUser, id)));
    }

    @PostMapping("/offers/{id}/decline")
    public ResponseEntity<ApiResponse<CustomOfferResponse>> declineCustomOffer(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Custom offer declined", messagingService.declineCustomOffer(currentUser, id)));
    }
}

package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.entity.User;
import com.marketforge.entity.UserNotification;
import com.marketforge.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserNotification>>> getNotifications(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getNotifications(currentUser, page, size)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.countUnread(currentUser))));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal User currentUser) {
        notificationService.markAllRead(currentUser);
        return ResponseEntity.ok(ApiResponse.<Void>builder().success(true).message("All notifications marked read").build());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        notificationService.markRead(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked read", null));
    }
}

package com.marketforge.service;

import com.marketforge.entity.User;
import com.marketforge.entity.UserNotification;
import com.marketforge.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final UserNotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public Page<UserNotification> getNotifications(User user, int page, int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public long countUnread(User user) {
        return notificationRepository.countUnread(user.getId());
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllRead(user.getId());
        broadcastUnreadCount(user);
    }

    @Transactional
    public void markRead(User user, Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUser().getId().equals(user.getId()) && n.getReadAt() == null) {
                n.setReadAt(java.time.LocalDateTime.now());
                notificationRepository.save(n);
                broadcastUnreadCount(user);
            }
        });
    }

    @Transactional
    public UserNotification send(User user, String type, String title, String message, String link) {
        UserNotification notif = notificationRepository.save(UserNotification.builder()
                .user(user).type(type).title(title).message(message).link(link).build());

        try {
            if (user != null && user.getEmail() != null) {
                messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/notifications", notif);
                broadcastUnreadCount(user);
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch WebSocket notification: {}", e.getMessage());
        }

        return notif;
    }

    private void broadcastUnreadCount(User user) {
        try {
            if (user != null && user.getEmail() != null) {
                long unread = countUnread(user);
                messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/unread-count", unread);
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch unread count: {}", e.getMessage());
        }
    }
}


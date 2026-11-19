package com.marketforge.repository;

import com.marketforge.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m LEFT JOIN FETCH m.sender LEFT JOIN FETCH m.attachments " +
           "WHERE m.conversation.id = :conversationId ORDER BY m.createdAt ASC")
    List<Message> findByConversationId(@Param("conversationId") Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id != :userId AND m.readAt IS NULL")
    long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE (m.conversation.buyer.id = :userId OR m.conversation.seller.id = :userId) " +
           "AND m.sender.id != :userId AND m.readAt IS NULL")
    long countTotalUnreadMessagesForUser(@Param("userId") Long userId);

    Message findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Message m SET m.readAt = CURRENT_TIMESTAMP WHERE m.conversation.id = :conversationId AND m.sender.id != :userId AND m.readAt IS NULL")
    int markConversationMessagesAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}

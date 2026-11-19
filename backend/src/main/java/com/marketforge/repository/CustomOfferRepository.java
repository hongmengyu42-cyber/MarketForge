package com.marketforge.repository;

import com.marketforge.entity.CustomOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomOfferRepository extends JpaRepository<CustomOffer, Long> {

    @Query("SELECT o FROM CustomOffer o WHERE o.conversation.id = :conversationId ORDER BY o.createdAt DESC")
    List<CustomOffer> findByConversationId(@Param("conversationId") Long conversationId);
}

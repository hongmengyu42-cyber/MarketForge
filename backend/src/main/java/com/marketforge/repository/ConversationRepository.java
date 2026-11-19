package com.marketforge.repository;

import com.marketforge.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByListingIdAndBuyerIdAndSellerId(Long listingId, Long buyerId, Long sellerId);

    Optional<Conversation> findByBuyerIdAndSellerId(Long buyerId, Long sellerId);

    @Query("SELECT c FROM Conversation c " +
           "LEFT JOIN FETCH c.listing LEFT JOIN FETCH c.buyer LEFT JOIN FETCH c.seller " +
           "WHERE c.buyer.id = :userId OR c.seller.id = :userId " +
           "ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> findByUserId(@Param("userId") Long userId);
}

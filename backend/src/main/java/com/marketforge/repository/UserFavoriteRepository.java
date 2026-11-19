package com.marketforge.repository;

import com.marketforge.entity.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    @Query("SELECT f FROM UserFavorite f " +
           "JOIN FETCH f.listing l " +
           "LEFT JOIN FETCH l.category " +
           "LEFT JOIN FETCH l.sellerProfile sp " +
           "LEFT JOIN FETCH sp.user " +
           "LEFT JOIN FETCH l.images " +
           "WHERE f.user.id = :userId " +
           "ORDER BY f.createdAt DESC")
    List<UserFavorite> findByUserIdWithListing(@Param("userId") Long userId);

    @Query("SELECT f.listing.id FROM UserFavorite f WHERE f.user.id = :userId")
    List<Long> findListingIdsByUserId(@Param("userId") Long userId);

    Optional<UserFavorite> findByUserIdAndListingId(Long userId, Long listingId);

    boolean existsByUserIdAndListingId(Long userId, Long listingId);

    void deleteByUserIdAndListingId(Long userId, Long listingId);
}

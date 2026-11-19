package com.marketforge.repository;

import com.marketforge.entity.Listing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ListingRepository extends JpaRepository<Listing, Long> {

    Optional<Listing> findBySlug(String slug);

    @Query("SELECT l FROM Listing l " +
           "LEFT JOIN FETCH l.sellerProfile sp " +
           "LEFT JOIN FETCH sp.user " +
           "LEFT JOIN FETCH l.category " +
           "LEFT JOIN FETCH l.images " +
           "WHERE l.slug = :slug AND l.status = 'ACTIVE'")
    Optional<Listing> findPublicBySlug(@Param("slug") String slug);

    @Query("SELECT l FROM Listing l " +
           "LEFT JOIN FETCH l.category " +
           "LEFT JOIN FETCH l.images " +
           "WHERE l.sellerProfile.id = :sellerProfileId")
    Page<Listing> findBySellerProfileId(@Param("sellerProfileId") Long sellerProfileId, Pageable pageable);

    List<Listing> findBySellerProfileIdAndStatus(Long sellerProfileId, Listing.ListingStatus status);

    @Query(value = "SELECT DISTINCT l FROM Listing l " +
           "LEFT JOIN FETCH l.category " +
           "LEFT JOIN FETCH l.sellerProfile sp " +
           "LEFT JOIN FETCH sp.user " +
           "WHERE l.status = 'ACTIVE' " +
           "AND (:categorySlug IS NULL OR l.category.slug = :categorySlug) " +
           "AND (:minPrice IS NULL OR l.priceAmount >= :minPrice) " +
           "AND (:maxPrice IS NULL OR l.priceAmount <= :maxPrice) " +
           "AND (:maxDeliveryDays IS NULL OR l.deliveryDays <= :maxDeliveryDays) " +
           "AND (:minRating IS NULL OR l.averageRating >= :minRating) " +
           "AND (:search IS NULL OR LOWER(l.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(l.description) LIKE LOWER(CONCAT('%', :search, '%')))",
           countQuery = "SELECT COUNT(DISTINCT l) FROM Listing l " +
           "WHERE l.status = 'ACTIVE' " +
           "AND (:categorySlug IS NULL OR l.category.slug = :categorySlug) " +
           "AND (:minPrice IS NULL OR l.priceAmount >= :minPrice) " +
           "AND (:maxPrice IS NULL OR l.priceAmount <= :maxPrice) " +
           "AND (:maxDeliveryDays IS NULL OR l.deliveryDays <= :maxDeliveryDays) " +
           "AND (:minRating IS NULL OR l.averageRating >= :minRating) " +
           "AND (:search IS NULL OR LOWER(l.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(l.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Listing> findPublicWithFilters(
            @Param("categorySlug") String categorySlug,
            @Param("minPrice") Long minPrice,
            @Param("maxPrice") Long maxPrice,
            @Param("maxDeliveryDays") Integer maxDeliveryDays,
            @Param("minRating") Double minRating,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT COUNT(l) FROM Listing l WHERE l.status = 'ACTIVE'")
    long countActive();
}

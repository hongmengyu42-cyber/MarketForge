package com.marketforge.repository;

import com.marketforge.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByEmailVerificationToken(String token);

    Optional<User> findByResetPasswordToken(String token);

    @Query("SELECT COUNT(u) FROM User u WHERE u.isAdmin = true")
    long countAdmins();

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.sellerProfile LEFT JOIN FETCH u.buyerProfile WHERE u.id = :id")
    Optional<User> findByIdWithProfiles(@Param("id") Long id);

    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:isAdmin IS NULL OR u.isAdmin = :isAdmin) " +
           "AND (:flagged IS NULL OR u.isFlaggedForReview = :flagged)")
    Page<User> findUsersWithFilters(
            @Param("search") String search,
            @Param("isAdmin") Boolean isAdmin,
            @Param("flagged") Boolean flagged,
            Pageable pageable);
}

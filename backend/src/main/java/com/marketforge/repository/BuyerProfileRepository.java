package com.marketforge.repository;

import com.marketforge.entity.BuyerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BuyerProfileRepository extends JpaRepository<BuyerProfile, Long> {
    Optional<BuyerProfile> findByUserId(Long userId);
}

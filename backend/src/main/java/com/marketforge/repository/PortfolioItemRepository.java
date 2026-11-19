package com.marketforge.repository;

import com.marketforge.entity.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {
    List<PortfolioItem> findByUserIdOrderByCreatedAtDesc(Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
}

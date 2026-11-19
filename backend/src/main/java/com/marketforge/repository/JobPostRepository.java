package com.marketforge.repository;

import com.marketforge.entity.JobPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JobPostRepository extends JpaRepository<JobPost, Long> {

    Optional<JobPost> findBySlug(String slug);

    Page<JobPost> findByClientIdOrderByCreatedAtDesc(Long clientId, Pageable pageable);

    @Query("SELECT j FROM JobPost j " +
           "WHERE (:status IS NULL OR j.status = :status) " +
           "AND (:categoryId IS NULL OR j.category.id = :categoryId) " +
           "AND (:budgetType IS NULL OR j.budgetType = :budgetType) " +
           "AND (:experienceLevel IS NULL OR j.experienceLevel = :experienceLevel) " +
           "AND (:keyword IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(j.skills) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<JobPost> searchJobs(
            @Param("status") String status,
            @Param("categoryId") Long categoryId,
            @Param("budgetType") String budgetType,
            @Param("experienceLevel") String experienceLevel,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}

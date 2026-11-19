package com.marketforge.repository;

import com.marketforge.entity.UserSkillBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserSkillBadgeRepository extends JpaRepository<UserSkillBadge, Long> {
    List<UserSkillBadge> findByUserIdAndPassedTrueOrderByEarnedAtDesc(Long userId);
    List<UserSkillBadge> findByUserId(Long userId);
    Optional<UserSkillBadge> findByUserIdAndAssessmentId(Long userId, Long assessmentId);
}

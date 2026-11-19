package com.marketforge.repository;

import com.marketforge.entity.SkillAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SkillAssessmentRepository extends JpaRepository<SkillAssessment, Long> {
    Optional<SkillAssessment> findByTitle(String title);
}

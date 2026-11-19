package com.marketforge.repository;

import com.marketforge.entity.JobProposal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobProposalRepository extends JpaRepository<JobProposal, Long> {

    List<JobProposal> findByJobIdOrderByCreatedAtDesc(Long jobId);

    Page<JobProposal> findByFreelancerIdOrderByCreatedAtDesc(Long freelancerId, Pageable pageable);

    Optional<JobProposal> findByJobIdAndFreelancerId(Long jobId, Long freelancerId);

    boolean existsByJobIdAndFreelancerId(Long jobId, Long freelancerId);

    int countByJobId(Long jobId);
}

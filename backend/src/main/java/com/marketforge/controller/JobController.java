package com.marketforge.controller;

import com.marketforge.dto.request.CreateJobRequest;
import com.marketforge.dto.request.SubmitProposalRequest;
import com.marketforge.dto.request.UpdateJobRequest;
import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.JobProposalResponse;
import com.marketforge.dto.response.JobResponse;
import com.marketforge.dto.response.OrderResponse;
import com.marketforge.entity.User;
import com.marketforge.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    // Public search & list jobs
    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String budgetType,
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                jobService.getPublicJobs(keyword, categoryId, budgetType, experienceLevel, page, size)));
    }

    // Public get single job
    @GetMapping("/{slugOrId}")
    public ResponseEntity<ApiResponse<JobResponse>> getJob(
            @PathVariable String slugOrId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success(jobService.getJob(slugOrId, currentUser)));
    }

    // Client post a new job
    @PostMapping
    public ResponseEntity<ApiResponse<JobResponse>> createJob(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateJobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Job posted successfully", jobService.createJob(currentUser, request)));
    }

    // Client update job
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> updateJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody UpdateJobRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Job updated successfully",
                jobService.updateJob(currentUser, id, request)));
    }

    // Client close job
    @PostMapping("/{id}/close")
    public ResponseEntity<ApiResponse<JobResponse>> closeJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Job closed", jobService.closeJob(currentUser, id)));
    }

    // Client get all jobs they posted
    @GetMapping("/my/posted")
    public ResponseEntity<ApiResponse<Page<JobResponse>>> getMyPostedJobs(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(jobService.getMyPostedJobs(currentUser, page, size)));
    }

    // Freelancer submit proposal
    @PostMapping("/{id}/proposals")
    public ResponseEntity<ApiResponse<JobProposalResponse>> submitProposal(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody SubmitProposalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Proposal submitted successfully",
                        jobService.submitProposal(currentUser, id, request)));
    }

    // Client get all proposals for their job
    @GetMapping("/{id}/proposals")
    public ResponseEntity<ApiResponse<List<JobProposalResponse>>> getJobProposals(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(jobService.getJobProposals(currentUser, id)));
    }

    // Freelancer get their submitted proposals
    @GetMapping("/my/proposals")
    public ResponseEntity<ApiResponse<Page<JobProposalResponse>>> getMyProposals(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(jobService.getMyProposals(currentUser, page, size)));
    }

    // Client update proposal status (e.g. SHORTLISTED, DECLINED, INTERVIEWING)
    @PutMapping("/proposals/{proposalId}/status")
    public ResponseEntity<ApiResponse<JobProposalResponse>> updateProposalStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long proposalId,
            @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.success("Proposal status updated",
                jobService.updateProposalStatus(currentUser, proposalId, status)));
    }

    // Client hire freelancer & fund escrow
    @PostMapping("/proposals/{proposalId}/hire")
    public ResponseEntity<ApiResponse<OrderResponse>> hireFreelancer(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long proposalId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Freelancer hired successfully! Escrow funded.",
                        jobService.hireFreelancer(currentUser, proposalId)));
    }
}

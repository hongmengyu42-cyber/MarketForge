package com.marketforge.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketforge.dto.request.CreateJobRequest;
import com.marketforge.dto.request.SubmitProposalRequest;
import com.marketforge.dto.request.UpdateJobRequest;
import com.marketforge.dto.response.JobProposalResponse;
import com.marketforge.dto.response.JobResponse;
import com.marketforge.dto.response.OrderResponse;
import com.marketforge.entity.*;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {

    private final JobPostRepository jobPostRepository;
    private final JobProposalRepository jobProposalRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;
    private final OrderStatusTransitionRepository transitionRepository;
    private final ConversationRepository conversationRepository;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${stripe.platform-fee-percent:10}")
    private int platformFeePercent;

    @Transactional(readOnly = true)
    public Page<JobResponse> getPublicJobs(
            String keyword, Long categoryId, String budgetType, String experienceLevel, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String bt = (budgetType != null && !budgetType.isBlank() && !"ALL".equalsIgnoreCase(budgetType)) ? budgetType.toUpperCase() : null;
        String el = (experienceLevel != null && !experienceLevel.isBlank() && !"ALL".equalsIgnoreCase(experienceLevel)) ? experienceLevel.toUpperCase() : null;

        Page<JobPost> jobs = jobPostRepository.searchJobs("OPEN", categoryId, bt, el, kw, pageable);
        return jobs.map(JobResponse::from);
    }

    @Transactional(readOnly = true)
    public JobResponse getJob(String slugOrId, User currentUser) {
        JobPost job;
        try {
            Long id = Long.parseLong(slugOrId);
            job = jobPostRepository.findById(id)
                    .orElseGet(() -> jobPostRepository.findBySlug(slugOrId)
                            .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + slugOrId)));
        } catch (NumberFormatException e) {
            job = jobPostRepository.findBySlug(slugOrId)
                    .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + slugOrId));
        }

        JobProposal myProposal = null;
        if (currentUser != null) {
            myProposal = jobProposalRepository.findByJobIdAndFreelancerId(job.getId(), currentUser.getId()).orElse(null);
        }

        return JobResponse.from(job, myProposal);
    }

    @Transactional
    public JobResponse createJob(User client, CreateJobRequest req) {
        Category category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepository.findById(req.getCategoryId()).orElse(null);
        }

        String baseSlug = slugify(req.getTitle());
        String slug = baseSlug + "-" + UUID.randomUUID().toString().substring(0, 6);

        long budgetCents = (long) (req.getBudgetAmount() * 100);
        Long budgetMaxCents = req.getBudgetMax() != null ? (long) (req.getBudgetMax() * 100) : null;

        String skillsString = req.getSkills() != null && !req.getSkills().isEmpty()
                ? String.join(", ", req.getSkills()) : null;

        JobPost job = JobPost.builder()
                .title(req.getTitle().trim())
                .slug(slug)
                .description(req.getDescription().trim())
                .client(client)
                .category(category)
                .budgetType(req.getBudgetType() != null ? req.getBudgetType().toUpperCase() : "FIXED_PRICE")
                .budgetAmount(budgetCents)
                .budgetMax(budgetMaxCents)
                .experienceLevel(req.getExperienceLevel() != null ? req.getExperienceLevel().toUpperCase() : "INTERMEDIATE")
                .duration(req.getDuration() != null ? req.getDuration() : "1 to 3 months")
                .status("OPEN")
                .skills(skillsString)
                .proposalsCount(0)
                .build();

        job = jobPostRepository.save(job);

        notificationService.send(client, "job", "Job Posted Successfully",
                "Your project '" + job.getTitle() + "' is now live on the MarketForge job board.", "/jobs/" + job.getSlug());

        return JobResponse.from(job);
    }

    @Transactional
    public JobResponse updateJob(User client, Long jobId, UpdateJobRequest req) {
        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", jobId));

        if (!job.getClient().getId().equals(client.getId()) && !Boolean.TRUE.equals(client.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "You do not have permission to edit this job post");
        }

        if (req.getTitle() != null && !req.getTitle().isBlank()) job.setTitle(req.getTitle().trim());
        if (req.getDescription() != null && !req.getDescription().isBlank()) job.setDescription(req.getDescription().trim());
        if (req.getBudgetType() != null) job.setBudgetType(req.getBudgetType().toUpperCase());
        if (req.getBudgetAmount() != null) job.setBudgetAmount((long) (req.getBudgetAmount() * 100));
        if (req.getBudgetMax() != null) job.setBudgetMax((long) (req.getBudgetMax() * 100));
        if (req.getExperienceLevel() != null) job.setExperienceLevel(req.getExperienceLevel().toUpperCase());
        if (req.getDuration() != null) job.setDuration(req.getDuration());
        if (req.getStatus() != null) job.setStatus(req.getStatus().toUpperCase());
        if (req.getCategoryId() != null) {
            job.setCategory(categoryRepository.findById(req.getCategoryId()).orElse(null));
        }
        if (req.getSkills() != null) {
            job.setSkills(String.join(", ", req.getSkills()));
        }

        job = jobPostRepository.save(job);
        return JobResponse.from(job);
    }

    @Transactional
    public JobResponse closeJob(User client, Long jobId) {
        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", jobId));

        if (!job.getClient().getId().equals(client.getId()) && !Boolean.TRUE.equals(client.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "You do not have permission to close this job post");
        }

        job.setStatus("CLOSED");
        job = jobPostRepository.save(job);
        return JobResponse.from(job);
    }

    @Transactional(readOnly = true)
    public Page<JobResponse> getMyPostedJobs(User client, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return jobPostRepository.findByClientIdOrderByCreatedAtDesc(client.getId(), pageable)
                .map(JobResponse::from);
    }

    @Transactional
    public JobProposalResponse submitProposal(User freelancer, Long jobId, SubmitProposalRequest req) {
        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", jobId));

        if (job.getClient().getId().equals(freelancer.getId())) {
            throw new BusinessException("SELF_BID", "You cannot submit a proposal for your own job post");
        }

        if (!"OPEN".equalsIgnoreCase(job.getStatus())) {
            throw new BusinessException("JOB_NOT_OPEN", "This job is currently " + job.getStatus() + " and not accepting proposals");
        }

        if (jobProposalRepository.existsByJobIdAndFreelancerId(jobId, freelancer.getId())) {
            throw new BusinessException("ALREADY_SUBMITTED", "You have already submitted a proposal for this job");
        }

        String attachmentsJson = null;
        if (req.getAttachments() != null && !req.getAttachments().isEmpty()) {
            try {
                attachmentsJson = objectMapper.writeValueAsString(req.getAttachments());
            } catch (Exception e) {
                attachmentsJson = String.join(",", req.getAttachments());
            }
        }

        long bidCents = (long) (req.getBidAmount() * 100);

        JobProposal proposal = JobProposal.builder()
                .job(job)
                .freelancer(freelancer)
                .bidAmount(bidCents)
                .deliveryDays(req.getDeliveryDays())
                .coverLetter(req.getCoverLetter().trim())
                .attachments(attachmentsJson)
                .status("SUBMITTED")
                .build();

        proposal = jobProposalRepository.save(proposal);

        // Update proposal counter on Job
        job.setProposalsCount(jobProposalRepository.countByJobId(jobId));
        jobPostRepository.save(job);

        notificationService.send(job.getClient(), "job", "New Proposal Received",
                freelancer.getName() + " submitted a $" + req.getBidAmount() + " proposal for '" + job.getTitle() + "'",
                "/jobs/" + job.getSlug());

        return JobProposalResponse.from(proposal);
    }

    @Transactional(readOnly = true)
    public List<JobProposalResponse> getJobProposals(User client, Long jobId) {
        JobPost job = jobPostRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", jobId));

        if (!job.getClient().getId().equals(client.getId()) && !Boolean.TRUE.equals(client.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "Only the client who posted this job can view incoming proposals");
        }

        List<JobProposal> proposals = jobProposalRepository.findByJobIdOrderByCreatedAtDesc(jobId);
        return proposals.stream().map(JobProposalResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Page<JobProposalResponse> getMyProposals(User freelancer, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return jobProposalRepository.findByFreelancerIdOrderByCreatedAtDesc(freelancer.getId(), pageable)
                .map(JobProposalResponse::from);
    }

    @Transactional
    public JobProposalResponse updateProposalStatus(User client, Long proposalId, String newStatus) {
        JobProposal proposal = jobProposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal", proposalId));

        if (!proposal.getJob().getClient().getId().equals(client.getId()) && !Boolean.TRUE.equals(client.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "Only the job client can update proposal status");
        }

        proposal.setStatus(newStatus.toUpperCase());
        proposal = jobProposalRepository.save(proposal);

        notificationService.send(proposal.getFreelancer(), "job", "Proposal Status Updated",
                "Your proposal for '" + proposal.getJob().getTitle() + "' was marked as " + newStatus,
                "/jobs/" + proposal.getJob().getSlug());

        return JobProposalResponse.from(proposal);
    }

    @Transactional
    public OrderResponse hireFreelancer(User client, Long proposalId) {
        JobProposal proposal = jobProposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal", proposalId));

        JobPost job = proposal.getJob();

        if (!job.getClient().getId().equals(client.getId()) && !Boolean.TRUE.equals(client.getIsAdmin())) {
            throw new BusinessException("FORBIDDEN", "Only the client can accept a proposal and hire");
        }

        if ("HIRED".equalsIgnoreCase(job.getStatus())) {
            throw new BusinessException("ALREADY_HIRED", "A freelancer has already been hired for this project");
        }

        User freelancer = proposal.getFreelancer();

        long totalCents = proposal.getBidAmount();
        long feeCents = (totalCents * platformFeePercent) / 100;
        long payoutCents = totalCents - feeCents;

        Order order = Order.builder()
                .orderNumber("MF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .listing(null) // Custom contract from Job Board
                .buyer(client)
                .seller(freelancer)
                .status(Order.OrderStatus.AUTHORIZED)
                .amountTotal(totalCents)
                .platformFeeAmount(feeCents)
                .sellerPayoutAmount(payoutCents)
                .currency("usd")
                .expectedDeliveryAt(LocalDateTime.now().plusDays(proposal.getDeliveryDays()))
                .requirements(job.getDescription())
                .requirementsSubmittedAt(LocalDateTime.now())
                .build();

        order = orderRepository.save(order);

        // Move to IN_PROGRESS & record ledger
        order.setStatus(Order.OrderStatus.IN_PROGRESS);
        orderRepository.save(order);

        transitionRepository.save(OrderStatusTransition.builder()
                .order(order)
                .fromStatus(null)
                .toStatus("in_progress")
                .triggeredBy(client)
                .reason("Hired from Job Post: " + job.getTitle())
                .build());

        ledgerService.recordEscrowCapture(order);

        // Update Job and Proposal
        job.setStatus("HIRED");
        job.setHiredFreelancer(freelancer);
        job.setOrder(order);
        jobPostRepository.save(job);

        proposal.setStatus("ACCEPTED");
        jobProposalRepository.save(proposal);

        // Link or create conversation for easy communication
        Optional<Conversation> existingConv = conversationRepository.findByBuyerIdAndSellerId(client.getId(), freelancer.getId());
        Long convId = null;
        if (existingConv.isPresent()) {
            convId = existingConv.get().getId();
        } else {
            Conversation conv = Conversation.builder()
                    .buyer(client)
                    .seller(freelancer)
                    .lastMessageAt(LocalDateTime.now())
                    .build();
            convId = conversationRepository.save(conv).getId();
        }

        notificationService.send(freelancer, "order", "🎉 You Have Been Hired!",
                "Client " + client.getName() + " accepted your proposal for '" + job.getTitle() + "'! Escrow is funded.",
                "/orders/" + order.getId());

        return OrderResponse.from(order, null, null, null, null, convId);
    }

    private String slugify(String input) {
        if (input == null) return "job";
        return input.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}

package com.marketforge.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IpCertificateResponse {

    private String certificateId;
    private String contractNumber;
    private Long orderId;
    private LocalDateTime issueDate;

    // Parties
    private String licensorName; // Freelancer (Assignor)
    private String licensorEmail;
    private Long licensorId;

    private String licenseeName; // Client (Assignee)
    private String licenseeEmail;
    private Long licenseeId;

    // Contract terms & deliverables
    private String projectTitle;
    private Double contractAmount;
    private String currency;
    private String escrowSettlementReference;
    private List<String> deliverableArtifacts;

    // Cryptographic & Legal attestation
    private String sha256VerificationHash;
    private String legalDeedTitle;
    private String legalTerms;
    private boolean isFullyExecuted;
}

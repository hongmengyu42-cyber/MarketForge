package com.marketforge.service;

import com.marketforge.dto.response.EmailLogDto;
import com.marketforge.entity.*;
import com.marketforge.repository.EmailLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final EmailLogRepository emailLogRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Async
    public void sendHtmlEmail(String toEmail, String toName, String subject, String templateType, String htmlBody, Long orderId) {
        String status = "SENT";
        String errorMsg = null;

        boolean canSendSmtp = mailSender != null && mailUsername != null && !mailUsername.isBlank();

        if (canSendSmtp) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(mailUsername, "MarketForge Platform");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlBody, true);
                mailSender.send(message);
                log.info("Transactional email sent to {} [{}]", toEmail, subject);
            } catch (Exception e) {
                log.warn("SMTP send failed for {}, falling back to logged simulation: {}", toEmail, e.getMessage());
                status = "FAILED";
                errorMsg = e.getMessage();
            }
        } else {
            status = "SIMULATED_SUCCESS";
            log.info("Simulated Transactional Email to {}: \"{}\" ({})", toEmail, subject, templateType);
        }

        EmailLog emailLog = EmailLog.builder()
                .recipientEmail(toEmail)
                .recipientName(toName)
                .subject(subject)
                .templateType(templateType)
                .htmlBody(htmlBody)
                .status(status)
                .errorMessage(errorMsg)
                .orderId(orderId)
                .sentAt(LocalDateTime.now())
                .build();

        emailLogRepository.save(emailLog);
    }

    @Transactional(readOnly = true)
    public Page<EmailLogDto> getEmailLogs(Pageable pageable) {
        return emailLogRepository.findAllByOrderBySentAtDesc(pageable).map(EmailLogDto::from);
    }

    // ─────────────────────────────────────────────────────────────
    // TRANSACTIONAL TEMPLATES
    // ─────────────────────────────────────────────────────────────

    public void sendOrderEscrowFunded(Order order) {
        String orderUrl = frontendUrl + "/orders/" + order.getId();
        double amount = (order.getAmountTotal() != null ? order.getAmountTotal() : 0) / 100.0;
        String title = order.getListing() != null ? order.getListing().getTitle() : "Custom Contract Project";

        // 1. Email to Seller: Work Authorized & Escrow Secured
        String sellerHtml = wrapTemplate(
                "Escrow Funded — Begin Project Work!",
                "Hello " + order.getSeller().getName() + ",<br><br>" +
                "Great news! Client <strong>" + order.getBuyer().getName() + "</strong> has officially deposited " +
                "<strong>$" + String.format("%.2f", amount) + "</strong> into MarketForge Escrow for order <strong>#" + order.getOrderNumber() + "</strong> (" + title + ").<br><br>" +
                "The funds are 100% secured in holding. You can now begin work with guaranteed payment upon completion.",
                "Go to Order Workspace",
                orderUrl
        );
        sendHtmlEmail(order.getSeller().getEmail(), order.getSeller().getName(),
                "Escrow Funded: #" + order.getOrderNumber() + " — Ready to Work!",
                "ESCROW_FUNDED_SELLER", sellerHtml, order.getId());

        // 2. Email to Buyer: Escrow Payment Receipt
        String buyerHtml = wrapTemplate(
                "Payment Received & Funds Secured in Escrow",
                "Hello " + order.getBuyer().getName() + ",<br><br>" +
                "Thank you for your payment of <strong>$" + String.format("%.2f", amount) + "</strong> for order <strong>#" + order.getOrderNumber() + "</strong>.<br><br>" +
                "<strong>100% Escrow Protection:</strong> Your funds will remain held safely in escrow until you review and confirm the milestones or final deliverables.",
                "View Your Order Room",
                orderUrl
        );
        sendHtmlEmail(order.getBuyer().getEmail(), order.getBuyer().getName(),
                "Receipt: Escrow Secured for Order #" + order.getOrderNumber(),
                "ESCROW_RECEIPT_BUYER", buyerHtml, order.getId());
    }

    public void sendMilestoneDelivered(Order order, OrderMilestone milestone) {
        String orderUrl = frontendUrl + "/orders/" + order.getId();
        double amount = (milestone.getAmountTotal() != null ? milestone.getAmountTotal() : 0) / 100.0;

        String buyerHtml = wrapTemplate(
                "Deliverable Submitted for Milestone #" + milestone.getMilestoneIndex(),
                "Hello " + order.getBuyer().getName() + ",<br><br>" +
                "Freelancer <strong>" + order.getSeller().getName() + "</strong> has submitted deliverables for Phase #" + milestone.getMilestoneIndex() + " (" + milestone.getTitle() + ").<br><br>" +
                "<strong>Allocated Escrow:</strong> $" + String.format("%.2f", amount) + "<br>" +
                (milestone.getDeliverableNotes() != null ? "<strong>Notes:</strong> " + milestone.getDeliverableNotes() + "<br>" : "") +
                (milestone.getDeliverableUrl() != null ? "<strong>Asset Link:</strong> <a href='" + milestone.getDeliverableUrl() + "'>" + milestone.getDeliverableUrl() + "</a><br><br>" : "<br>") +
                "Please inspect the work in your Order Room. You can approve the deliverable to disburse the milestone payment, or request adjustments.",
                "Review Milestone Deliverable",
                orderUrl
        );
        sendHtmlEmail(order.getBuyer().getEmail(), order.getBuyer().getName(),
                "Deliverable Ready: Milestone #" + milestone.getMilestoneIndex() + " (" + milestone.getTitle() + ")",
                "MILESTONE_DELIVERED", buyerHtml, order.getId());
    }

    public void sendMilestoneRevisionRequested(Order order, OrderMilestone milestone, String notes) {
        String orderUrl = frontendUrl + "/orders/" + order.getId();

        String sellerHtml = wrapTemplate(
                "Revision Requested: Milestone #" + milestone.getMilestoneIndex(),
                "Hello " + order.getSeller().getName() + ",<br><br>" +
                "Client <strong>" + order.getBuyer().getName() + "</strong> has requested revisions for Phase #" + milestone.getMilestoneIndex() + " (" + milestone.getTitle() + ").<br><br>" +
                "<strong>Client Feedback:</strong><br>" +
                "<blockquote style='border-left: 3px solid #e11d48; margin: 10px 0; padding-left: 12px; color: #475569; font-style: italic;'>" +
                notes + "</blockquote><br>" +
                "Please review the feedback and submit an updated deliverable when ready.",
                "View Revision Details",
                orderUrl
        );
        sendHtmlEmail(order.getSeller().getEmail(), order.getSeller().getName(),
                "Action Needed: Revision Requested on Milestone #" + milestone.getMilestoneIndex(),
                "MILESTONE_REVISION", sellerHtml, order.getId());
    }

    public void sendMilestoneApproved(Order order, OrderMilestone milestone) {
        String orderUrl = frontendUrl + "/orders/" + order.getId();
        double payout = (milestone.getSellerPayoutAmount() != null ? milestone.getSellerPayoutAmount() : 0) / 100.0;

        String sellerHtml = wrapTemplate(
                "Milestone Approved — Funds Released!",
                "Hello " + order.getSeller().getName() + ",<br><br>" +
                "Congratulations! Client <strong>" + order.getBuyer().getName() + "</strong> has approved Phase #" + milestone.getMilestoneIndex() + " (" + milestone.getTitle() + ").<br><br>" +
                "<strong>Escrow Released:</strong> $" + String.format("%.2f", payout) + " has been added to your Available Balance in your MarketForge Wallet.<br><br>" +
                "You may withdraw your earnings immediately via Stripe Connect Express or ACH bank wire.",
                "Go to Wallet & View Earnings",
                frontendUrl + "/wallet"
        );
        sendHtmlEmail(order.getSeller().getEmail(), order.getSeller().getName(),
                "Funds Released: $" + String.format("%.2f", payout) + " for Milestone #" + milestone.getMilestoneIndex(),
                "MILESTONE_APPROVED", sellerHtml, order.getId());
    }

    public void sendOrderCompleted(Order order) {
        String orderUrl = frontendUrl + "/orders/" + order.getId();

        // Email to Buyer with IP Ownership Transfer Notice
        String buyerHtml = wrapTemplate(
                "Order Completed & IP Ownership Transferred",
                "Hello " + order.getBuyer().getName() + ",<br><br>" +
                "Your order <strong>#" + order.getOrderNumber() + "</strong> is officially complete and all milestone escrow releases have settled.<br><br>" +
                "<strong>Intellectual Property Transfer:</strong> You are now the legal owner of all deliverables created under this contract. " +
                "Your official <strong>MarketForge Intellectual Property Transfer Certificate</strong> has been generated and sealed.",
                "Download IP Certificate",
                orderUrl
        );
        sendHtmlEmail(order.getBuyer().getEmail(), order.getBuyer().getName(),
                "Completed: Order #" + order.getOrderNumber() + " (IP Certificate Ready)",
                "ORDER_COMPLETED_BUYER", buyerHtml, order.getId());
    }

    public void sendPayoutCompleted(User user, PayoutRequest payout) {
        double amount = (payout.getAmount() != null ? payout.getAmount() : 0) / 100.0;
        String walletUrl = frontendUrl + "/wallet";

        String html = wrapTemplate(
                "Withdrawal Payout Processed Successfully",
                "Hello " + user.getName() + ",<br><br>" +
                "Your withdrawal request for <strong>$" + String.format("%.2f", amount) + "</strong> has been processed via " +
                "<strong>" + payout.getPayoutMethod().replace('_', ' ') + "</strong>.<br><br>" +
                "<strong>Reference:</strong> " + payout.getTransactionReference() + "<br>" +
                "<strong>Destination:</strong> " + payout.getDestinationDetails() + "<br><br>" +
                "Funds are typically available within 30 minutes for Stripe Express Instant Deposits, or 1-2 business days for standard ACH wires.",
                "Review Wallet Statement",
                walletUrl
        );
        sendHtmlEmail(user.getEmail(), user.getName(),
                "Withdrawal Confirmed: $" + String.format("%.2f", amount) + " (" + payout.getTransactionReference() + ")",
                "PAYOUT_COMPLETED", html, null);
    }

    // ─────────────────────────────────────────────────────────────
    // HTML STYLING WRAPPER
    // ─────────────────────────────────────────────────────────────


    public void sendEmailVerification(User user, String token) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + token;
        String html = wrapTemplate(
                "Verify Your Email Address",
                "Hello " + user.getName() + ",<br><br>" +
                "Welcome to MarketForge! Please verify your email address to activate your account " +
                "and start browsing top freelancers.<br><br>" +
                "<strong>This link expires in 24 hours.</strong>",
                "Verify My Email",
                verifyUrl
        );
        sendHtmlEmail(user.getEmail(), user.getName(),
                "Verify Your MarketForge Email Address",
                "EMAIL_VERIFICATION", html, null);
    }

    public void sendPasswordReset(User user, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String html = wrapTemplate(
                "Reset Your Password",
                "Hello " + user.getName() + ",<br><br>" +
                "We received a request to reset the password for your MarketForge account.<br><br>" +
                "<strong>This link expires in 1 hour.</strong> If you did not request a password reset, " +
                "you can safely ignore this email — your account is secure.",
                "Reset My Password",
                resetUrl
        );
        sendHtmlEmail(user.getEmail(), user.getName(),
                "Reset Your MarketForge Password",
                "PASSWORD_RESET", html, null);
    }
    private String wrapTemplate(String headline, String bodyText, String ctaText, String ctaUrl) {
        return "<!DOCTYPE html>" +
                "<html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<style>" +
                "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }" +
                ".container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }" +
                ".header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }" +
                ".logo { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 6px; }" +
                ".logo span { color: #6366f1; }" +
                ".headline { font-size: 20px; font-weight: 800; margin: 0; color: #f8fafc; }" +
                ".content { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; }" +
                ".btn { display: inline-block; background: #4f46e5; color: #ffffff !important; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3); }" +
                ".footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }" +
                "</style></head><body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<div class='logo'>Market<span>Forge</span><div style='font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #a5b4fc; margin-top: 2px;'>Build • Sell • Grow</div></div>" +
                "<h1 class='headline'>" + headline + "</h1>" +
                "</div>" +
                "<div class='content'>" +
                bodyText +
                "<div style='text-align: center; margin-top: 15px;'>" +
                "<a href='" + ctaUrl + "' class='btn'>" + ctaText + "</a>" +
                "</div>" +
                "</div>" +
                "<div class='footer'>" +
                "© 2026 MarketForge Escrow & Freelance Marketplace. Protected by 256-bit SSL encryption.<br>" +
                "This is an automated transactional security alert. Do not reply directly to this message." +
                "</div>" +
                "</div></body></html>";
    }
}

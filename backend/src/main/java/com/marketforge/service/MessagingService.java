package com.marketforge.service;

import com.marketforge.dto.request.CreateCustomOfferRequest;
import com.marketforge.dto.request.SendMessageRequest;
import com.marketforge.dto.request.StartConversationRequest;
import com.marketforge.dto.response.ConversationResponse;
import com.marketforge.dto.response.CustomOfferResponse;
import com.marketforge.dto.response.MessageResponse;
import com.marketforge.entity.*;
import com.marketforge.exception.BusinessException;
import com.marketforge.exception.ResourceNotFoundException;
import com.marketforge.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final CustomOfferRepository customOfferRepository;
    private final OrderRepository orderRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Value("${stripe.platform-fee-percent:10}")
    private int platformFeePercent;

    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(User currentUser) {
        List<Conversation> convs = conversationRepository.findByUserId(currentUser.getId());
        return convs.stream().map(c -> toConversationResponse(c, currentUser)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(User currentUser, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));
        if (!conv.getBuyer().getId().equals(currentUser.getId()) && !conv.getSeller().getId().equals(currentUser.getId())) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this conversation");
        }

        List<Message> messages = messageRepository.findByConversationId(conversationId);
        return messages.stream().map(m -> toMessageResponse(m, currentUser)).collect(Collectors.toList());
    }

    @Transactional
    public ConversationResponse startConversation(User buyer, StartConversationRequest req) {
        Listing listing = null;
        User seller = null;

        if (req.getListingId() != null) {
            listing = listingRepository.findById(req.getListingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Listing", req.getListingId()));
            seller = listing.getSellerProfile().getUser();
        } else if (req.getSellerId() != null) {
            seller = userRepository.findById(req.getSellerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Seller", req.getSellerId()));
        } else {
            throw new BusinessException("INVALID_REQUEST", "Please provide a listingId or sellerId");
        }

        if (seller.getId().equals(buyer.getId())) {
            throw new BusinessException("Cannot message yourself");
        }

        final Listing finalListing = listing;
        final User finalSeller = seller;

        Conversation conv;
        if (finalListing != null) {
            conv = conversationRepository
                    .findByListingIdAndBuyerIdAndSellerId(finalListing.getId(), buyer.getId(), finalSeller.getId())
                    .orElseGet(() -> conversationRepository.save(Conversation.builder()
                            .listing(finalListing)
                            .buyer(buyer)
                            .seller(finalSeller)
                            .build()));
        } else {
            conv = conversationRepository
                    .findByBuyerIdAndSellerId(buyer.getId(), finalSeller.getId())
                    .orElseGet(() -> conversationRepository.save(Conversation.builder()
                            .buyer(buyer)
                            .seller(finalSeller)
                            .build()));
        }

        // Send first message
        messageRepository.save(Message.builder()
                .conversation(conv)
                .sender(buyer)
                .body(req.getBody().trim())
                .build());

        conv.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conv);

        return toConversationResponse(conv, buyer);
    }

    @Transactional
    public MessageResponse sendMessage(User sender, SendMessageRequest req) {
        Conversation conv = conversationRepository.findById(req.getConversationId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", req.getConversationId()));
        if (!conv.getBuyer().getId().equals(sender.getId()) && !conv.getSeller().getId().equals(sender.getId())) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this conversation");
        }

        Message message = messageRepository.save(Message.builder()
                .conversation(conv)
                .sender(sender)
                .body(req.getBody().trim())
                .build());

        conv.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conv);

        MessageResponse response = toMessageResponse(message, sender);

        // Real-Time WebSocket Broadcast
        try {
            messagingTemplate.convertAndSend("/topic/conversations/" + conv.getId(), response);

            User recipient = conv.getBuyer().getId().equals(sender.getId()) ? conv.getSeller() : conv.getBuyer();
            if (recipient != null && recipient.getEmail() != null) {
                messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", response);
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch WebSocket message: {}", e.getMessage());
        }

        return response;
    }

    @Transactional
    public int markAsRead(User user, Long conversationId) {
        return messageRepository.markConversationMessagesAsRead(conversationId, user.getId());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return messageRepository.countTotalUnreadMessagesForUser(user.getId());
    }

    @Transactional
    public CustomOfferResponse createCustomOffer(User seller, Long conversationId, CreateCustomOfferRequest req) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        if (!conv.getSeller().getId().equals(seller.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the freelancer can create a custom offer in this conversation");
        }

        long priceCents = req.getPriceAmount() * 100L;

        CustomOffer offer = CustomOffer.builder()
                .conversation(conv)
                .listing(conv.getListing())
                .seller(seller)
                .buyer(conv.getBuyer())
                .title(req.getTitle().trim())
                .description(req.getDescription() != null ? req.getDescription().trim() : null)
                .priceAmount(priceCents)
                .deliveryDays(req.getDeliveryDays())
                .status("pending")
                .build();

        offer = customOfferRepository.save(offer);

        // Automated notification message in chat
        String offerSummary = String.format("📄 Sent a custom offer: \"%s\" for $%.2f (%d days delivery).",
                offer.getTitle(), offer.getPriceAmount() / 100.0, offer.getDeliveryDays());
        Message autoMsg = messageRepository.save(Message.builder()
                .conversation(conv)
                .sender(seller)
                .body(offerSummary)
                .build());

        conv.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conv);

        CustomOfferResponse offerResponse = CustomOfferResponse.from(offer);

        try {
            messagingTemplate.convertAndSend("/topic/conversations/" + conv.getId() + "/offers", offerResponse);
            messagingTemplate.convertAndSend("/topic/conversations/" + conv.getId(), toMessageResponse(autoMsg, seller));
            if (conv.getBuyer() != null && conv.getBuyer().getEmail() != null) {
                messagingTemplate.convertAndSendToUser(conv.getBuyer().getEmail(), "/queue/messages", offerResponse);
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch WebSocket offer: {}", e.getMessage());
        }

        return offerResponse;
    }

    @Transactional(readOnly = true)
    public List<CustomOfferResponse> getCustomOffers(User user, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));
        if (!conv.getBuyer().getId().equals(user.getId()) && !conv.getSeller().getId().equals(user.getId())) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this conversation");
        }

        List<CustomOffer> offers = customOfferRepository.findByConversationId(conversationId);
        return offers.stream().map(CustomOfferResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public CustomOfferResponse acceptCustomOffer(User buyer, Long offerId) {
        CustomOffer offer = customOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomOffer", offerId));

        if (!offer.getBuyer().getId().equals(buyer.getId())) {
            throw new BusinessException("FORBIDDEN", "Only the buyer can accept this offer");
        }
        if (!"pending".equalsIgnoreCase(offer.getStatus())) {
            throw new BusinessException("INVALID_STATUS", "This offer is no longer pending");
        }

        // Calculate fees
        long totalCents = offer.getPriceAmount();
        long feeCents = (totalCents * platformFeePercent) / 100L;
        long payoutCents = totalCents - feeCents;

        // Auto-create order from custom offer
        Order order = Order.builder()
                .orderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .listing(offer.getListing())
                .buyer(offer.getBuyer())
                .seller(offer.getSeller())
                .status(Order.OrderStatus.IN_PROGRESS)
                .amountTotal(totalCents)
                .platformFeeAmount(feeCents)
                .sellerPayoutAmount(payoutCents)
                .currency("usd")
                .autoReleaseAt(LocalDateTime.now().plusDays(offer.getDeliveryDays() + 3))
                .build();

        order = orderRepository.save(order);

        offer.setStatus("accepted");
        offer.setOrder(order);
        offer = customOfferRepository.save(offer);

        // System message in chat
        String acceptedNotice = String.format("🎉 Custom offer \"%s\" was accepted! Order #%s is now IN PROGRESS.",
                offer.getTitle(), order.getOrderNumber());
        messageRepository.save(Message.builder()
                .conversation(offer.getConversation())
                .sender(buyer)
                .body(acceptedNotice)
                .build());

        offer.getConversation().setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(offer.getConversation());

        return CustomOfferResponse.from(offer);
    }

    @Transactional
    public CustomOfferResponse declineCustomOffer(User user, Long offerId) {
        CustomOffer offer = customOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomOffer", offerId));

        if (!offer.getBuyer().getId().equals(user.getId()) && !offer.getSeller().getId().equals(user.getId())) {
            throw new BusinessException("FORBIDDEN", "You do not have access to this offer");
        }
        if (!"pending".equalsIgnoreCase(offer.getStatus())) {
            throw new BusinessException("INVALID_STATUS", "This offer is no longer pending");
        }

        offer.setStatus("declined");
        offer = customOfferRepository.save(offer);

        String declineNotice = String.format("❌ Custom offer \"%s\" was declined.", offer.getTitle());
        messageRepository.save(Message.builder()
                .conversation(offer.getConversation())
                .sender(user)
                .body(declineNotice)
                .build());

        return CustomOfferResponse.from(offer);
    }

    // Helper: Map Conversation to ConversationResponse
    private ConversationResponse toConversationResponse(Conversation c, User currentUser) {
        boolean isBuyer = c.getBuyer().getId().equals(currentUser.getId());
        User otherUser = isBuyer ? c.getSeller() : c.getBuyer();
        String otherRole = isBuyer ? "Freelancer" : "Client";

        String otherAvatar = otherUser.getAvatarUrl();
        if (otherAvatar == null && otherUser.getSellerProfile() != null) {
            otherAvatar = otherUser.getSellerProfile().getAvatarUrl();
        }

        String listingTitle = null;
        String listingSlug = null;
        Long listingPrice = null;
        String listingImage = null;

        if (c.getListing() != null) {
            listingTitle = c.getListing().getTitle();
            listingSlug = c.getListing().getSlug();
            listingPrice = c.getListing().getPriceAmount();
            if (c.getListing().getImages() != null && !c.getListing().getImages().isEmpty()) {
                listingImage = c.getListing().getImages().get(0).getImageUrl();
            }
        }

        Message lastMsg = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(c.getId());
        String lastMsgSnippet = lastMsg != null ? lastMsg.getBody() : "Conversation started";
        long unread = messageRepository.countUnreadMessages(c.getId(), currentUser.getId());

        return ConversationResponse.builder()
                .id(c.getId())
                .listingId(c.getListing() != null ? c.getListing().getId() : null)
                .listingTitle(listingTitle)
                .listingSlug(listingSlug)
                .listingPrice(listingPrice)
                .listingImageUrl(listingImage)
                .otherUserId(otherUser.getId())
                .otherUserName(otherUser.getSellerProfile() != null && otherUser.getSellerProfile().getDisplayName() != null
                        ? otherUser.getSellerProfile().getDisplayName()
                        : otherUser.getName())
                .otherUserAvatar(otherAvatar)
                .otherUserRole(otherRole)
                .lastMessage(lastMsgSnippet)
                .lastMessageAt(c.getLastMessageAt() != null ? c.getLastMessageAt() : c.getCreatedAt())
                .unreadCount(unread)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    // Helper: Map Message to MessageResponse
    private MessageResponse toMessageResponse(Message m, User currentUser) {
        User sender = m.getSender();
        String senderAvatar = sender.getAvatarUrl();
        if (senderAvatar == null && sender.getSellerProfile() != null) {
            senderAvatar = sender.getSellerProfile().getAvatarUrl();
        }

        return MessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .senderId(sender.getId())
                .senderName(sender.getSellerProfile() != null && sender.getSellerProfile().getDisplayName() != null
                        ? sender.getSellerProfile().getDisplayName()
                        : sender.getName())
                .senderAvatar(senderAvatar)
                .body(m.getBody())
                .readAt(m.getReadAt())
                .createdAt(m.getCreatedAt())
                .isMine(sender.getId().equals(currentUser.getId()))
                .build();
    }
}

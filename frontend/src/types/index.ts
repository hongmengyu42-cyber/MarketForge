// Types matching the Spring Boot API responses

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  authProvider?: string;
  isAdmin: boolean;
  riskScore: number;
  isFlaggedForReview: boolean;
  createdAt: string;
  isSeller: boolean;
  sellerProfile?: SellerProfileSummary;
}

export interface SellerProfileSummary {
  id: number;
  displayName: string;
  bio: string;
  avatarUrl: string;
  onboardingStatus: string;
  averageRating: number;
  avgQualityRating?: number;
  avgCommunicationRating?: number;
  avgDeadlineRating?: number;
  recommendationRate?: number;
  isTopRated?: boolean;
  reviewCount: number;
  completedOrdersCount: number;
  hourlyRate?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  listingCount: number;
}

export interface Skill {
  id: number;
  name: string;
  slug: string;
}

export interface Listing {
  id: number;
  title: string;
  slug: string;
  description?: string;
  priceAmount: number;
  currency: string;
  deliveryDays: number;
  revisionsIncluded: number;
  status: string;
  averageRating: number;
  reviewCount: number;
  completedOrdersCount: number;
  viewCount: number;
  category: { id: number; name: string; slug: string };
  seller: {
    id: number;
    name: string;
    displayName: string;
    avatarUrl: string;
    averageRating: number;
    reviewCount: number;
    completedOrdersCount: number;
    isTopRated?: boolean;
  };
  imageUrls: string[];
  skills: string[];
  createdAt: string;
}

export interface OrderDelivery {
  id: number;
  notes?: string;
  sourceUrl?: string;
  attachments?: string;
  createdAt: string;
  sellerId?: number;
  sellerName?: string;
}

export interface OrderMilestone {
  id: number;
  milestoneIndex: number;
  title: string;
  description?: string;
  amount: number;
  platformFeeAmount?: number;
  sellerPayoutAmount?: number;
  status: string; // 'funded_in_escrow' | 'in_progress' | 'delivered' | 'revision_requested' | 'approved'
  deliverableNotes?: string;
  deliverableUrl?: string;
  revisionNotes?: string;
  revisionRequestedAt?: string;
  deliveredAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
  status: string;
  publishableKey?: string;
  isMockMode: boolean;
  orderId?: number;
  description?: string;
}

export interface CreatePaymentIntentRequest {
  orderId?: number;
  listingId?: number;
  milestoneId?: number;
  customOfferId?: number;
  amount: number;
  currency?: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  orderId?: number;
  listingId?: number;
  milestoneId?: number;
}

export interface StripeConnectLinkResponse {
  accountId: string;
  url: string;
  status: string;
}

export interface OrderStatusTransition {
  id: number;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  triggeredByName?: string;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: string;
  amountTotal: number;
  platformFeeAmount: number;
  sellerPayoutAmount: number;
  currency: string;
  deliveredAt?: string;
  confirmedAt?: string;
  autoReleaseAt?: string;
  expectedDeliveryAt?: string;
  requirements?: string;
  requirementsSubmittedAt?: string;
  createdAt: string;
  conversationId?: number;
  listing: {
    id: number;
    title: string;
    slug: string;
    imageUrl?: string;
    deliveryDays?: number;
    categoryName?: string;
  };
  buyer: {
    id: number;
    name: string;
    displayName?: string;
    email: string;
    avatarUrl?: string;
  };
  seller: {
    id: number;
    name: string;
    displayName?: string;
    email: string;
    avatarUrl?: string;
  };
  deliveries?: OrderDelivery[];
  milestones?: OrderMilestone[];
  statusTransitions?: OrderStatusTransition[];
  review?: {
    id: number;
    rating: number;
    comment?: string;
    createdAt: string;
  };
  dispute?: {
    id: number;
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
  };
}

export interface Review {
  id: number;
  orderId?: number;
  orderNumber?: string;
  listingId?: number;
  listingTitle?: string;
  reviewerId?: number;
  reviewerName?: string;
  reviewerAvatar?: string;
  targetUserId?: number;
  targetUserName?: string;
  targetUserAvatar?: string;
  reviewType?: 'BUYER_TO_SELLER' | 'SELLER_TO_BUYER';
  rating: number;
  qualityRating?: number;
  communicationRating?: number;
  deadlineRating?: number;
  clarityRating?: number;
  cooperationRating?: number;
  wouldRecommend?: boolean;
  comment: string;
  sellerResponse?: string;
  respondedAt?: string;
  isRevealed?: boolean;
  autoRevealAt?: string;
  revealedAt?: string;
  createdAt: string;
  reviewer?: { id: number; name: string; avatarUrl?: string };
  seller?: { id: number; name: string; avatarUrl?: string };
}

export interface OrderReviewStatus {
  orderId: number;
  orderNumber: string;
  isCompleted: boolean;
  canReview: boolean;
  hasBuyerReviewed: boolean;
  hasSellerReviewed: boolean;
  isRevealed: boolean;
  autoRevealAt?: string;
  daysLeftToReveal?: number;
  myReview?: Review;
  counterpartReview?: Review;
}

export interface SellerReputation {
  sellerId: number;
  sellerName: string;
  averageRating?: number;
  reviewCount: number;
  avgQualityRating?: number;
  avgCommunicationRating?: number;
  avgDeadlineRating?: number;
  recommendationRate?: number;
  isTopRated: boolean;
  completedOrdersCount: number;
  ratingDistribution: Record<number, number>;
}

export interface CreateReviewData {
  orderId: number;
  rating: number;
  qualityRating?: number;
  communicationRating?: number;
  deadlineRating?: number;
  clarityRating?: number;
  cooperationRating?: number;
  wouldRecommend?: boolean;
  comment?: string;
}

export interface DisputeMessage {
  id: number;
  disputeId: number;
  senderId?: number;
  senderName: string;
  senderRole: 'BUYER' | 'SELLER' | 'MEDIATOR';
  senderAvatar?: string;
  body: string;
  isSystemEvent: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface DisputeAttachment {
  id: number;
  disputeId: number;
  uploadedById?: number;
  uploadedByName?: string;
  fileUrl: string;
  fileName?: string;
  createdAt: string;
}

export interface DisputeSettlementOffer {
  id: number;
  disputeId: number;
  proposedById: number;
  proposedByName: string;
  proposedByRole: 'BUYER' | 'SELLER';
  refundAmount: number; // in cents
  releaseAmount: number; // in cents
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  respondedAt?: string;
  createdAt: string;
}

export interface DisputeResolution {
  id: number;
  disputeId: number;
  adminId?: number;
  adminName: string;
  verdict: string;
  rulingNotes: string;
  buyerRefundAmount: number;
  sellerPayoutAmount: number;
  createdAt: string;
}

export interface Dispute {
  id: number;
  orderId?: number;
  orderNumber?: string;
  orderAmount?: number;
  currency?: string;
  listingTitle?: string;
  listingSlug?: string;
  buyerId?: number;
  buyerName?: string;
  buyerAvatar?: string;
  sellerId?: number;
  sellerName?: string;
  sellerAvatar?: string;
  raisedById?: number;
  raisedByName?: string;
  raisedByRole?: string;
  reason: string;
  description?: string;
  status: string; // open, under_review, evidence_requested, resolved_refund, resolved_release, resolved_partial
  stage?: string; // MUTUAL_NEGOTIATION, ARBITRATION_REVIEW, RESOLVED
  claimAmount?: number;
  refundAmount: number;
  releaseAmount: number;
  resolvedAt?: string;
  resolvedByAdminName?: string;
  assignedMediatorName?: string;
  createdAt: string;
  updatedAt?: string;
  order?: Order;
  raisedBy?: { id: number; name: string };
  messages?: DisputeMessage[];
  attachments?: DisputeAttachment[];
  settlementOffers?: DisputeSettlementOffer[];
  latestResolution?: DisputeResolution;
}

export interface Conversation {
  id: number;
  listingId?: number;
  listingTitle?: string;
  listingSlug?: string;
  listingPrice?: number;
  listingImageUrl?: string;
  otherUserId: number;
  otherUserName: string;
  otherUserAvatar?: string;
  otherUserRole: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  body: string;
  readAt?: string;
  createdAt: string;
  isMine: boolean;
}

export interface CustomOffer {
  id: number;
  conversationId: number;
  listingId?: number;
  sellerId: number;
  sellerName: string;
  buyerId: number;
  buyerName: string;
  title: string;
  description?: string;
  priceAmount: number;
  deliveryDays: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  orderId?: number;
  createdAt: string;
}

export interface JobProposal {
  id: number;
  jobId: number;
  jobTitle: string;
  jobSlug: string;
  bidAmount: number;
  deliveryDays: number;
  coverLetter: string;
  attachments?: string;
  status: 'SUBMITTED' | 'SHORTLISTED' | 'INTERVIEWING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  freelancer: {
    id: number;
    name: string;
    displayName?: string;
    avatarUrl?: string;
    rating?: number;
    reviewCount?: number;
    bio?: string;
  };
}

export interface JobPost {
  id: number;
  title: string;
  slug: string;
  description: string;
  budgetType: 'FIXED_PRICE' | 'HOURLY';
  budgetAmount: number;
  budgetMax?: number;
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  duration: string;
  status: 'OPEN' | 'IN_REVIEW' | 'HIRED' | 'CLOSED' | 'CANCELLED';
  skills: string[];
  proposalsCount: number;
  deadlineAt?: string;
  createdAt: string;
  client: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
    memberSince?: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  myProposal?: JobProposal;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  activeOrders: number;
  openDisputes: number;
  totalRevenue: number;
  ledgerAccounts: { code: string; name: string; type: string; balance: number }[];
  recentLedgerEntries: { id: number; accountCode: string; entryType: string; amount: number; description: string; createdAt: string }[];
  categoriesBreakdown: { name: string; listingCount: number }[];
}

export interface WalletTransaction {
  id: string;
  type: 'ESCROW_CAPTURE' | 'ESCROW_RELEASE' | 'PLATFORM_FEE' | 'WITHDRAWAL' | 'REFUND' | string;
  title: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING_CLEARANCE' | 'PROCESSING' | 'HELD_IN_ESCROW' | string;
  orderNumber?: string;
  orderId?: number;
  date: string;
}

export interface PayoutRequest {
  id: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  amount: number;
  payoutMethod: 'STRIPE_CONNECT' | 'BANK_TRANSFER' | 'PAYPAL' | string;
  destinationDetails?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | string;
  transactionReference?: string;
  notes?: string;
  processedAt?: string;
  createdAt: string;
}

export interface WalletData {
  availableBalance: number;
  pendingClearance: number;
  inEscrow: number;
  lifetimeEarnings: number;
  totalWithdrawn: number;
  totalSpent: number;
  stripeConnected: boolean;
  stripeAccountId?: string;
  defaultPayoutMethod?: string;
  transactions: WalletTransaction[];
  payoutRequests: PayoutRequest[];
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  orderId: number;
  issueDate: string;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerDisplayName?: string;
  sellerEmail: string;
  serviceTitle: string;
  subtotal: number;
  platformFee: number;
  totalAmount: number;
  sellerPayoutAmount: number;
  status: string;
  escrowStatus: string;
}

export interface PortfolioItem {
  id: number;
  userId: number;
  userDisplayName?: string;
  title: string;
  description?: string;
  projectUrl?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  skills?: string[];
  completionDate?: string;
  createdAt: string;
}

export interface CreatePortfolioRequest {
  title: string;
  description?: string;
  projectUrl?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  skills?: string[];
  completionDate?: string;
}

export interface SkillAssessmentSummary {
  id: number;
  title: string;
  description: string;
  skillName: string;
  passingScore: number;
  timeLimitMinutes: number;
  questionsCount: number;
  userPassed: boolean;
  userScore?: number;
}

export interface IpCertificateResponse {
  certificateId: string;
  contractNumber: string;
  orderId: number;
  issueDate: string;
  licensorName: string;
  licensorEmail: string;
  licensorId: number;
  licenseeName: string;
  licenseeEmail: string;
  licenseeId: number;
  projectTitle: string;
  contractAmount: number;
  currency: string;
  escrowSettlementReference: string;
  deliverableArtifacts: string[];
  sha256VerificationHash: string;
  legalDeedTitle: string;
  legalTerms: string;
  isFullyExecuted: boolean;
}

export interface EmailLog {
  id: number;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  templateType?: string;
  htmlBody?: string;
  status: string;
  orderId?: number;
  sentAt: string;
}

export interface AssessmentQuestion {
  id: number;
  question: string;
  options: string[];
}

export interface SkillAssessmentDetail {
  id: number;
  title: string;
  description: string;
  skillName: string;
  passingScore: number;
  timeLimitMinutes: number;
  questions: AssessmentQuestion[];
}

export interface UserSkillBadge {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  skillName: string;
  score: number;
  passed: boolean;
  badgeLevel: string;
  earnedAt: string;
}

export interface AssessmentResult {
  assessmentId: number;
  assessmentTitle: string;
  score: number;
  passed: boolean;
  passingScore: number;
  totalQuestions: number;
  correctAnswers: number;
  feedbackMessage: string;
  badge?: UserSkillBadge;
}



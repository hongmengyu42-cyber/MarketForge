import axios from 'axios';
import { useAuthStore } from '@/store';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token and handle multipart
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If sending FormData, delete Content-Type so the browser sets multipart boundary automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/' && window.location.pathname !== '/explore') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// ──── Auth ────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleLogin: (data: { idToken?: string; email?: string; name?: string; picture?: string; googleId?: string }) =>
    api.post('/auth/google', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) => api.patch('/auth/me', data),
  updateAvatar: (avatarUrl: string | null) => api.patch('/auth/me/avatar', { avatarUrl }),
  updatePassword: (data: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }) =>
    api.post('/auth/me/password', data),
  // Phase 2 — Email verification & password reset
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// ──── Listings ────
export const listingsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/listings', { params }),
  getBySlug: (slug: string) => api.get(`/listings/${slug}`),
  create: (data: Record<string, unknown>) => api.post('/listings', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/listings/${id}`, data),
  pause: (id: number) => api.post(`/listings/${id}/pause`),
  activate: (id: number) => api.post(`/listings/${id}/activate`),
  delete: (id: number) => api.delete(`/listings/${id}`),
  getMine: (params?: Record<string, unknown>) => api.get('/seller/listings', { params }),
};

// ──── Orders ────
export const ordersApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/orders', { params }),
  getById: (id: number) => api.get(`/orders/${id}`),
  create: (data: { listingId: number }) => api.post('/orders', data),
  submitRequirements: (id: number, data: { requirements: string }) =>
    api.post(`/orders/${id}/requirements`, data),
  deliver: (id: number, data: { notes?: string; sourceUrl?: string; attachments?: string[] }) =>
    api.post(`/orders/${id}/deliver`, data),
  requestRevision: (id: number, data: { reason?: string; notes: string }) =>
    api.post(`/orders/${id}/revision`, data),
  confirm: (id: number) => api.post(`/orders/${id}/confirm`),
  addMilestone: (id: number, data: { title: string; description?: string; amount: number; milestoneIndex?: number }) =>
    api.post(`/orders/${id}/milestones`, data),
  deliverMilestone: (id: number, milestoneId: number, data: { notes?: string; sourceUrl?: string; attachments?: string[] }) =>
    api.post(`/orders/${id}/milestones/${milestoneId}/deliver`, data),
  approveMilestone: (id: number, milestoneId: number) =>
    api.post(`/orders/${id}/milestones/${milestoneId}/approve`),
  requestMilestoneRevision: (id: number, milestoneId: number, data: { reason?: string; notes: string }) =>
    api.post(`/orders/${id}/milestones/${milestoneId}/revision`, data),
  cancel: (id: number) => api.post(`/orders/${id}/cancel`),
};

// ──── Metadata ────
export const metadataApi = {
  getCategories: () => api.get('/categories'),
  getSkills: () => api.get('/skills'),
};

// ──── Messaging ────
export const messagingApi = {
  getConversations: () => api.get('/messaging/conversations'),
  getMessages: (conversationId: number) => api.get(`/messaging/conversations/${conversationId}/messages`),
  startConversation: (data: { listingId?: number; sellerId?: number; body: string }) =>
    api.post('/messaging/conversations', data),
  sendMessage: (data: { conversationId: number; body: string }) =>
    api.post('/messaging/messages', data),
  markAsRead: (conversationId: number) =>
    api.post(`/messaging/conversations/${conversationId}/read`),
  getUnreadCount: () =>
    api.get('/messaging/unread-count'),
  createCustomOffer: (conversationId: number, data: { title: string; description?: string; priceAmount: number; deliveryDays: number }) =>
    api.post(`/messaging/conversations/${conversationId}/offers`, data),
  getCustomOffers: (conversationId: number) =>
    api.get(`/messaging/conversations/${conversationId}/offers`),
  acceptCustomOffer: (offerId: number) =>
    api.post(`/messaging/offers/${offerId}/accept`),
  declineCustomOffer: (offerId: number) =>
    api.post(`/messaging/offers/${offerId}/decline`),
};

// ──── Jobs & Proposals (Phase 3) ────
export const jobsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/jobs', { params }),
  getByIdOrSlug: (slugOrId: string | number) => api.get(`/jobs/${slugOrId}`),
  create: (data: {
    title: string;
    description: string;
    categoryId?: number;
    budgetType?: string;
    budgetAmount: number;
    budgetMax?: number;
    experienceLevel?: string;
    duration?: string;
    skills?: string[];
  }) => api.post('/jobs', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/jobs/${id}`, data),
  close: (id: number) => api.post(`/jobs/${id}/close`),
  getMyPosted: (params?: Record<string, unknown>) => api.get('/jobs/my/posted', { params }),
  submitProposal: (
    jobId: number,
    data: {
      bidAmount: number;
      deliveryDays: number;
      coverLetter: string;
      attachments?: string[];
    }
  ) => api.post(`/jobs/${jobId}/proposals`, data),
  getProposals: (jobId: number) => api.get(`/jobs/${jobId}/proposals`),
  getMyProposals: (params?: Record<string, unknown>) => api.get('/jobs/my/proposals', { params }),
  updateProposalStatus: (proposalId: number, status: string) =>
    api.put(`/jobs/proposals/${proposalId}/status`, null, { params: { status } }),
  hire: (proposalId: number) => api.post(`/jobs/proposals/${proposalId}/hire`),
};

// ──── Reviews ────
export const reviewsApi = {
  getForListing: (listingId: number, params?: Record<string, unknown>) =>
    api.get(`/reviews/listing/${listingId}`, { params }),
  getForSeller: (sellerId: number, params?: Record<string, unknown>) =>
    api.get(`/reviews/seller/${sellerId}`, { params }),
  getSellerReputation: (sellerId: number) =>
    api.get(`/reviews/seller/${sellerId}/reputation`),
  getOrderStatus: (orderId: number) =>
    api.get(`/reviews/order/${orderId}/status`),
  create: (data: {
    orderId: number;
    rating: number;
    qualityRating?: number;
    communicationRating?: number;
    deadlineRating?: number;
    clarityRating?: number;
    cooperationRating?: number;
    wouldRecommend?: boolean;
    comment?: string;
  }) => api.post('/reviews', data),
  respond: (id: number, response: string) =>
    api.post(`/reviews/${id}/respond`, { response }),
};

// ──── Disputes ────
export const disputesApi = {
  create: (data: { orderId: number; reason: string; description?: string }) =>
    api.post('/disputes', data),
  getById: (id: number) => api.get(`/disputes/${id}`),
  getByOrderId: (orderId: number) => api.get(`/disputes/order/${orderId}`),
  postMessage: (id: number, data: { body: string; attachmentUrl?: string; attachmentName?: string }) =>
    api.post(`/disputes/${id}/messages`, data),
  createSettlementOffer: (id: number, data: { refundAmount: number; releaseAmount: number; message?: string }) =>
    api.post(`/disputes/${id}/offers`, data),
  respondToSettlementOffer: (id: number, offerId: number, data: { action: 'ACCEPT' | 'REJECT' }) =>
    api.post(`/disputes/${id}/offers/${offerId}/respond`, data),
};

// ──── Notifications ────
export const notificationsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
};

// ──── Seller ────
export const sellerApi = {
  getProfile: () => api.get('/seller/profile'),
  onboard: () => api.post('/seller/onboard'),
  getDashboard: () => api.get('/seller/dashboard'),
  getPublic: (id: number) => api.get(`/sellers/${id}`),
  getAnalytics: () => api.get('/seller/analytics'),
};

// ──── Admin ────
export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  toggleRole: (userId: number, role: string) =>
    api.post(`/admin/users/${userId}/toggle-role`, { role }),
  getListings: (params?: Record<string, unknown>) => api.get('/admin/listings', { params }),
  moderateListing: (id: number, action: string) =>
    api.post(`/admin/listings/${id}/moderate`, { action }),
  getDisputes: (params?: Record<string, unknown>) => api.get('/admin/disputes', { params }),
  getDispute: (id: number) => api.get(`/admin/disputes/${id}`),
  updateDisputeStatus: (id: number, status: string) =>
    api.put(`/admin/disputes/${id}/status`, { status }),
  resolveDispute: (id: number, data: {
    verdict: string;
    rulingNotes: string;
    customBuyerRefundAmount?: number;
    customSellerPayoutAmount?: number;
  }) => api.post(`/admin/disputes/${id}/resolve`, data),
  getEmailLogs: (params?: Record<string, unknown>) => api.get('/admin/emails', { params }),
  // Phase 2 — Order management
  getOrders: (params?: Record<string, unknown>) => api.get('/admin/orders', { params }),
  orderAction: (id: number, action: string, reason?: string) =>
    api.post(`/admin/orders/${id}/action`, { action, reason }),
  getPayouts: () => api.get('/admin/payouts'),
  payoutAction: (id: number, action: string, notes?: string) =>
    api.post(`/admin/payouts/${id}/action`, { action, notes }),
  getAnalytics: () => api.get('/admin/analytics'),
};

// ──── Upload ────
export const uploadApi = {
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': undefined },
    });
  },
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': undefined },
    });
  },
};

// ──── Wallet & Escrow Payouts ────
export const walletApi = {
  getWallet: () => api.get('/wallet'),
  requestPayout: (data: { amount: number; payoutMethod: string; destinationDetails?: string }) =>
    api.post('/wallet/payout', data),
  connectStripe: (stripeAccountId?: string) =>
    api.post('/wallet/connect-stripe', { stripeAccountId }),
  getStripeConnectLink: () => api.post('/wallet/stripe-connect-link'),
  getInvoice: (orderId: number) => api.get(`/wallet/invoices/${orderId}`),
};

// ──── Payments & Stripe Escrow (Sprint 4) ────
export const paymentsApi = {
  createPaymentIntent: (data: {
    orderId?: number;
    listingId?: number;
    milestoneId?: number;
    customOfferId?: number;
    amount: number;
    currency?: string;
  }) => api.post('/payments/create-intent', data),
  confirmPayment: (data: {
    paymentIntentId: string;
    orderId?: number;
    listingId?: number;
    milestoneId?: number;
  }) => api.post('/payments/confirm', data),
};

// ──── Deliverable Vault & IP Security (Sprint 5) ────
export const vaultApi = {
  getCertificate: (orderId: number) => api.get(`/vault/certificate/${orderId}`),
  generateToken: (data: { orderId: number; assetUrl?: string }) => api.post('/vault/token', data),
};

// ──── Portfolio ────
export const portfolioApi = {
  getMy: () => api.get('/portfolio/my'),
  getForUser: (userId: number) => api.get(`/portfolio/users/${userId}`),
  create: (data: Record<string, unknown>) => api.post('/portfolio', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/portfolio/${id}`, data),
  delete: (id: number) => api.delete(`/portfolio/${id}`),
};

// ──── Skill Assessments & Badges ────
export const assessmentsApi = {
  getAll: () => api.get('/assessments'),
  getById: (id: number) => api.get(`/assessments/${id}`),
  submit: (id: number, answers: Record<number, number>) =>
    api.post(`/assessments/${id}/submit`, { answers }),
  getMyBadges: () => api.get('/assessments/badges/me'),
  getUserBadges: (userId: number) => api.get(`/assessments/badges/user/${userId}`),
};

// ──── Saved / Favorites ────
export const favoritesApi = {
  getAll: () => api.get('/favorites'),
  getIds: () => api.get('/favorites/ids'),
  toggle: (listingId: number) => api.post(`/favorites/${listingId}`),
  remove: (listingId: number) => api.delete(`/favorites/${listingId}`),
};

export default api;

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, reviewsApi, disputesApi, vaultApi } from '@/api';
import { useAuthStore } from '@/store';
import { formatPrice, formatDate, getStatusColor, getInitials, getMediaUrl } from '@/utils';
import type { Order, OrderMilestone, OrderReviewStatus, CreateReviewData } from '@/types';
import IpCertificateModal from '@/components/modals/IpCertificateModal';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Star,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  FileText,
  Layers,
  History,
  Send,
  HelpCircle,
  Copy,
  Check,
  Plus,
  Package,
  RotateCcw,
  Link as LinkIcon,
  Wallet,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Scale,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Active Tab: 'deliveries' | 'milestones' | 'requirements' | 'activity'
  const [activeTab, setActiveTab] = useState<'deliveries' | 'milestones' | 'requirements' | 'activity'>('deliveries');

  // Modals
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverySourceUrl, setDeliverySourceUrl] = useState('');
  const [deliveryAttachments, setDeliveryAttachments] = useState<string[]>([]);
  const [attachmentInput, setAttachmentInput] = useState('');

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('Missing Requirements');
  const [revisionNotes, setRevisionNotes] = useState('');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [deadlineRating, setDeadlineRating] = useState(5);
  const [clarityRating, setClarityRating] = useState(5);
  const [cooperationRating, setCooperationRating] = useState(5);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [reviewComment, setReviewComment] = useState('');

  // Seller response inline state
  const [isSellerResponseOpen, setIsSellerResponseOpen] = useState(false);
  const [sellerResponseText, setSellerResponseText] = useState('');

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('non_delivery');
  const [disputeDescription, setDisputeDescription] = useState('');

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState<number | ''>(100);

  // Milestone Delivery & Revision Modals
  const [selectedMilestone, setSelectedMilestone] = useState<OrderMilestone | null>(null);
  const [isDeliverMilestoneModalOpen, setIsDeliverMilestoneModalOpen] = useState(false);
  const [milestoneDeliverNotes, setMilestoneDeliverNotes] = useState('');
  const [milestoneDeliverUrl, setMilestoneDeliverUrl] = useState('');
  const [isMilestoneRevisionModalOpen, setIsMilestoneRevisionModalOpen] = useState(false);
  const [milestoneRevisionNotes, setMilestoneRevisionNotes] = useState('');

  // IP Certificate & Security Vault
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [vaultTokenLink, setVaultTokenLink] = useState('');

  // Requirements form
  const [requirementsInput, setRequirementsInput] = useState('');

  // Copy order number feedback
  const [copied, setCopied] = useState(false);

  // Fetch Order details
  const {
    data: orderData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order-workspace', orderId],
    queryFn: () => ordersApi.getById(orderId),
    enabled: !isNaN(orderId),
    refetchInterval: 10000,
  });

  const order: Order | undefined = orderData?.data?.data;

  // Fetch Double-Blind Review Status
  const { data: reviewStatusData } = useQuery({
    queryKey: ['order-review-status', orderId],
    queryFn: () => reviewsApi.getOrderStatus(orderId),
    enabled: !isNaN(orderId),
    refetchInterval: 10000,
  });

  const reviewStatus = reviewStatusData?.data?.data as OrderReviewStatus | undefined;

  // Initialize requirements input once order is loaded
  useEffect(() => {
    if (order?.requirements) {
      setRequirementsInput(order.requirements);
    }
  }, [order?.requirements]);

  // Who is viewing?
  const isBuyer = user?.id === order?.buyer?.id;
  const isSeller = user?.id === order?.seller?.id;

  // Countdown calculations
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!order?.expectedDeliveryAt) return;

    const calculateTime = () => {
      const target = new Date(order.expectedDeliveryAt!).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsOverdue(true);
        const overdueDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
        const overdueHours = Math.floor((Math.abs(diff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeRemaining(`${overdueDays}d ${overdueHours}h overdue`);
      } else {
        setIsOverdue(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${days}d ${hours}h ${mins}m`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [order?.expectedDeliveryAt]);

  // Mutations
  const deliverMutation = useMutation({
    mutationFn: (data: { notes?: string; sourceUrl?: string; attachments?: string[] }) =>
      ordersApi.deliver(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Work delivered successfully! The buyer has been notified.');
      setIsDeliverModalOpen(false);
      setDeliveryNotes('');
      setDeliverySourceUrl('');
      setDeliveryAttachments([]);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to deliver work';
      toast.error(msg);
    },
  });

  const revisionMutation = useMutation({
    mutationFn: (data: { reason?: string; notes: string }) =>
      ordersApi.requestRevision(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Revision request submitted to the freelancer.');
      setIsRevisionModalOpen(false);
      setRevisionNotes('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to request revision';
      toast.error(msg);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => ordersApi.confirm(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-review-status', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Delivery accepted! Escrow funds have been released.');
      setIsReviewModalOpen(true);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to confirm delivery';
      toast.error(msg);
    },
  });

  const requirementsMutation = useMutation({
    mutationFn: (requirements: string) => ordersApi.submitRequirements(orderId, { requirements }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      toast.success('Requirements submitted successfully! The freelancer has been notified.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit requirements';
      toast.error(msg);
    },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; amount: number }) =>
      ordersApi.addMilestone(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      toast.success('Milestone added successfully.');
      setIsMilestoneModalOpen(false);
      setMilestoneTitle('');
      setMilestoneDesc('');
      setMilestoneAmount(100);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add milestone';
      toast.error(msg);
    },
  });

  const approveMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) => ordersApi.approveMilestone(orderId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Milestone approved! Funds released from escrow.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve milestone';
      toast.error(msg);
    },
  });

  const deliverMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, notes, sourceUrl }: { milestoneId: number; notes?: string; sourceUrl?: string }) =>
      ordersApi.deliverMilestone(orderId, milestoneId, { notes, sourceUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Milestone deliverable submitted for client review!');
      setIsDeliverMilestoneModalOpen(false);
      setSelectedMilestone(null);
      setMilestoneDeliverNotes('');
      setMilestoneDeliverUrl('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit milestone deliverable';
      toast.error(msg);
    },
  });

  const requestMilestoneRevisionMutation = useMutation({
    mutationFn: ({ milestoneId, notes }: { milestoneId: number; notes: string }) =>
      ordersApi.requestMilestoneRevision(orderId, milestoneId, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Milestone revision request sent to freelancer.');
      setIsMilestoneRevisionModalOpen(false);
      setSelectedMilestone(null);
      setMilestoneRevisionNotes('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to request milestone revision';
      toast.error(msg);
    },
  });

  const generateVaultTokenMutation = useMutation({
    mutationFn: (assetUrl?: string) => vaultApi.generateToken({ orderId, assetUrl }),
    onSuccess: (res) => {
      const token = res.data?.data?.token;
      if (token) {
        const link = `${window.location.origin}/api/v1/vault/download/${token}`;
        setVaultTokenLink(link);
        navigator.clipboard.writeText(link);
        toast.success('Secure 60-minute signed vault link copied to clipboard!');
      }
    },
    onError: () => {
      toast.error('Failed to generate vault token');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data: CreateReviewData) => reviewsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-review-status', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Your feedback has been securely submitted and sealed in Double-Blind escrow!');
      setIsReviewModalOpen(false);
      setReviewComment('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit review';
      toast.error(msg);
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response: string }) =>
      reviewsApi.respond(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-review-status', orderId] });
      toast.success('Response posted successfully!');
      setIsSellerResponseOpen(false);
      setSellerResponseText('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to post response';
      toast.error(msg);
    },
  });

  const disputeMutation = useMutation({
    mutationFn: (data: { orderId: number; reason: string; description?: string }) =>
      disputesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-workspace', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Dispute case opened! Redirecting to Arbitration Room...');
      setIsDisputeModalOpen(false);
      setDisputeDescription('');
      navigate(`/orders/${orderId}/dispute`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to open dispute';
      toast.error(msg);
    },
  });

  const handleCopyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      toast.success('Order number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddAttachment = () => {
    if (!attachmentInput.trim()) return;
    setDeliveryAttachments([...deliveryAttachments, attachmentInput.trim()]);
    setAttachmentInput('');
  };

  const handleRemoveAttachment = (idx: number) => {
    setDeliveryAttachments(deliveryAttachments.filter((_, i) => i !== idx));
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-40 bg-gray-200 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-3xl" />
          <div className="h-96 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Order Workspace Not Found</h2>
        <p className="text-sm text-gray-500">
          This order does not exist or you do not have permission to access this project room.
        </p>
        <Link to="/orders" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>
    );
  }

  // Derived state
  const isDelivered = order.status === 'delivered';
  const isRevisionRequested = order.status === 'revision_requested';
  const isCompleted = order.status === 'confirmed' || order.status === 'released' || order.status === 'paid_out';
  const isCancelled = order.status === 'cancelled';

  const deliveries = order.deliveries || [];
  const milestones = order.milestones || [];
  const transitions = order.statusTransitions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ──── TOP BAR & BREADCRUMBS ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            title="Back to Orders"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">
                Order Workspace
              </span>
              <span className="text-gray-300">•</span>
              <button
                onClick={handleCopyOrderNumber}
                className="text-xs font-mono text-gray-500 hover:text-gray-900 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md transition-colors"
                title="Click to copy order number"
              >
                <span>{order.orderNumber}</span>
                {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
              {order.listing?.title || 'Custom Project Delivery'}
            </h1>
          </div>
        </div>

        {/* Counterparty Chat Shortcut */}
        <div className="flex items-center gap-2">
          <Link
            to="/wallet"
            className="btn-secondary btn-sm flex items-center gap-1.5 shadow-xs"
            title="View Escrow Ledger & Balance"
          >
            <Wallet size={15} className="text-emerald-600" />
            <span className="hidden sm:inline">Escrow Wallet</span>
          </Link>

          {order.conversationId ? (
            <Link
              to={`/messages?conversationId=${order.conversationId}`}
              className="btn-secondary btn-sm flex items-center gap-2 shadow-xs"
            >
              <MessageSquare size={15} className="text-primary-600" />
              <span>{isBuyer ? `Chat with ${order.seller?.displayName || order.seller?.name}` : `Chat with ${order.buyer?.name}`}</span>
            </Link>
          ) : (
            <Link
              to="/messages"
              className="btn-secondary btn-sm flex items-center gap-2 shadow-xs"
            >
              <MessageSquare size={15} className="text-primary-600" />
              <span>Inbox & Messages</span>
            </Link>
          )}

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(
              order.status
            )}`}
          >
            {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ──── ACTIVE DISPUTE BANNER (IF DISPUTED) ──── */}
      {order.status.toLowerCase() === 'disputed' && (
        <div className="bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-2 border-red-300 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Scale size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full border border-red-200">
                  Escrow Funds Frozen
                </span>
                <span className="text-xs text-amber-800 font-semibold flex items-center gap-1">
                  <Lock size={12} /> Formal Dispute Active
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-1">
                Order Under Formal Dispute Mediation
              </h3>
              <p className="text-xs text-gray-600 mt-0.5 max-w-xl">
                Escrow funds ({formatPrice(order.amountTotal, order.currency)}) are protected in third-party neutral escrow. Completion approvals and payout releases are temporarily locked until mediation or mutual settlement concludes.
              </p>
            </div>
          </div>

          <Link
            to={`/orders/${order.id}/dispute`}
            className="btn-primary py-3 px-6 rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-lg shadow-red-600/20 shrink-0 hover:scale-102 transition-all"
          >
            <Scale size={16} />
            <span>Enter Dispute Arbitration Room</span>
          </Link>
        </div>
      )}

      {/* ──── HERO SUMMARY & ESCROW STATUS ──── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left: Financial & Due Date */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit border border-emerald-100">
              <ShieldCheck size={16} />
              <span>MarketForge Escrow Protection Active</span>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium">Secured Project Escrow</div>
              <div className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                {formatPrice(order.amountTotal, order.currency)}
              </div>
              {isSeller && (
                <p className="text-xs text-gray-500 mt-1">
                  Your Net Payout: <span className="font-bold text-emerald-600">{formatPrice(order.sellerPayoutAmount, order.currency)}</span> (10% platform fee deducted)
                </p>
              )}
            </div>
          </div>

          {/* Middle: Live Countdown Clock */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 text-center space-y-1.5">
            <div className="text-xs font-semibold text-gray-500 flex items-center justify-center gap-1.5">
              <Clock size={14} className={isOverdue ? 'text-red-500' : 'text-primary-600'} />
              <span>{isCompleted ? 'Project Finished' : isOverdue ? 'Delivery Overdue' : 'Delivery Countdown'}</span>
            </div>
            <div
              className={`text-2xl font-black tracking-tight ${
                isCompleted
                  ? 'text-emerald-600'
                  : isOverdue
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {isCompleted ? 'Delivered & Approved' : timeRemaining || 'In Progress'}
            </div>
            <div className="text-[11px] text-gray-500">
              Due Date: {order.expectedDeliveryAt ? formatDate(order.expectedDeliveryAt) : 'Calculated after requirements'}
            </div>
          </div>

          {/* Right: Counterparty Card */}
          <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="avatar w-12 h-12 text-sm font-bold bg-primary-100 text-primary-700 rounded-2xl ring-2 ring-white shadow-xs relative overflow-hidden flex items-center justify-center">
                <span>{isBuyer ? getInitials(order.seller?.displayName || order.seller?.name || 'S') : getInitials(order.buyer?.name || 'B')}</span>
                {(isBuyer ? order.seller?.avatarUrl : order.buyer?.avatarUrl) && (
                  <img
                    src={getMediaUrl(isBuyer ? order.seller?.avatarUrl : order.buyer?.avatarUrl)}
                    alt={isBuyer ? 'Seller' : 'Buyer'}
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    className="w-full h-full object-cover rounded-2xl absolute inset-0"
                  />
                )}
              </div>
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {isBuyer ? 'Assigned Freelancer' : 'Client'}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {isBuyer ? order.seller?.displayName || order.seller?.name : order.buyer?.name}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                  {isBuyer ? order.seller?.email : order.buyer?.email}
                </div>
              </div>
            </div>

            {order.listing?.slug && (
              <Link
                to={`/listings/${order.listing.slug}`}
                target="_blank"
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all shadow-2xs"
                title="View Original Gig Listing"
              >
                <ExternalLink size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* ──── PROGRESS STEPPER ──── */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Step 1: Placed */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                <Check size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">1. Order Placed</p>
                <p className="text-[11px] text-gray-500">Funds escrowed</p>
              </div>
            </div>

            {/* Step 2: Requirements */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  order.requirementsSubmittedAt
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary-100 text-primary-700 ring-2 ring-primary-500/30'
                }`}
              >
                {order.requirementsSubmittedAt ? <Check size={16} /> : '2'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">2. Requirements</p>
                <p className="text-[11px] text-gray-500">
                  {order.requirementsSubmittedAt ? 'Submitted' : 'Pending Client'}
                </p>
              </div>
            </div>

            {/* Step 3: Delivery */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  isDelivered || isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isRevisionRequested
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isCompleted ? <Check size={16} /> : isRevisionRequested ? <RotateCcw size={14} /> : '3'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">3. Work Delivery</p>
                <p className="text-[11px] text-gray-500">
                  {isDelivered
                    ? 'Ready for Review'
                    : isRevisionRequested
                    ? 'Revision Active'
                    : isCompleted
                    ? 'Accepted'
                    : 'In Development'}
                </p>
              </div>
            </div>

            {/* Step 4: Completion */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? <Check size={16} /> : '4'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">4. Completion</p>
                <p className="text-[11px] text-gray-500">
                  {isCompleted ? 'Escrow Released' : 'Pending Approval'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── CALL-TO-ACTION NOTIFICATION BANNER ──── */}
      {isDelivered && isBuyer && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">
                Work Delivered! Please review the files & release escrow
              </h3>
              <p className="text-xs text-amber-700 mt-1 max-w-2xl leading-relaxed">
                The freelancer has uploaded the project deliverables. Test the work thoroughly. You have 3 days to confirm before funds auto-release. If changes are needed, click Request Revision.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="btn-secondary btn-sm bg-white hover:bg-amber-100/50 text-amber-800 border-amber-300 flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Request Revision
            </button>
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 size={15} />
              {confirmMutation.isPending ? 'Releasing...' : 'Approve & Release Funds'}
            </button>
          </div>
        </div>
      )}

      {isRevisionRequested && (
        <div className="bg-purple-50 border border-purple-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <RotateCcw size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-purple-900">
                Revision Requested by Client
              </h3>
              <p className="text-xs text-purple-700 mt-1 max-w-2xl leading-relaxed">
                The client has requested adjustments on the deliverable. Review the feedback in the Deliveries tab, apply the requested changes, and submit an updated delivery version.
              </p>
            </div>
          </div>
          {isSeller && (
            <button
              onClick={() => setIsDeliverModalOpen(true)}
              className="btn-primary btn-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 self-end sm:self-center"
            >
              <Upload size={14} /> Deliver Revised Work
            </button>
          )}
        </div>
      )}

      {/* ──── WORKSPACE TABS & MAIN CONTENT ──── */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 pt-4 bg-gray-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`pb-4 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'deliveries'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Package size={16} />
            <span>Deliveries & Files</span>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {deliveries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`pb-4 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'milestones'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers size={16} />
            <span>Milestones</span>
            {milestones.length > 0 && (
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {milestones.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('requirements')}
            className={`pb-4 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requirements'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText size={16} />
            <span>Requirements</span>
            {order.requirementsSubmittedAt && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-4 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'activity'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History size={16} />
            <span>Activity Trail</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8">
          {/* ════ TAB 1: DELIVERIES & WORK ════ */}
          {activeTab === 'deliveries' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Project Deliverables & Versions</h3>
                  <p className="text-xs text-gray-500">
                    All finished code, design assets, and download links delivered for this project.
                  </p>
                </div>

                {isSeller && !isCompleted && !isCancelled && (
                  <button
                    onClick={() => setIsDeliverModalOpen(true)}
                    className="btn-primary btn-sm flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Upload size={15} /> Deliver New Version
                  </button>
                )}
              </div>

              {/* IP Assignment & Security Vault Banner */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                      Deliverable Security & Intellectual Property Vault
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isCompleted || milestones.some((m) => m.status === 'approved')
                      ? 'Full worldwide copyright and license rights have been executed and assigned to the client.'
                      : 'All deliverables are secured under escrow lock. Copyright transfers upon milestone or contract approval.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => generateVaultTokenMutation.mutate(deliveries[0]?.sourceUrl)}
                    disabled={generateVaultTokenMutation.isPending || deliveries.length === 0}
                    className="btn-secondary btn-sm bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs flex items-center gap-1.5"
                    title="Generate time-limited signed download token"
                  >
                    <Lock size={13} />
                    <span>Generate 60-Min Vault Token</span>
                  </button>

                  <button
                    onClick={() => setIsIpModalOpen(true)}
                    className="btn-primary btn-sm bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Award size={14} />
                    <span>View Legal IP Deed</span>
                  </button>
                </div>
              </div>

              {vaultTokenLink && (
                <div className="mb-4 p-3 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] truncate">
                    <Lock size={13} className="shrink-0" />
                    <span className="truncate">Active Signed Link: {vaultTokenLink}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Valid for 60 mins • Copied to clipboard</span>
                </div>
              )}

              {deliveries.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl mx-auto flex items-center justify-center">
                    <Package size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">No deliverables uploaded yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {isSeller
                      ? 'When you finish the service, click "Deliver New Version" above to submit source links and files to your client.'
                      : 'The freelancer is currently working on your project. Once completed, their deliverables will appear here.'}
                  </p>
                  {isSeller && !isCompleted && (
                    <button
                      onClick={() => setIsDeliverModalOpen(true)}
                      className="btn-primary btn-sm inline-flex items-center gap-1.5 mt-2"
                    >
                      <Upload size={14} /> Submit First Deliverable
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {deliveries.map((del, idx) => (
                    <div
                      key={del.id}
                      className="border border-gray-200 rounded-2xl p-5 hover:border-primary-200 transition-colors space-y-3 bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs">
                            Version {deliveries.length - idx}.0
                          </span>
                          <span className="text-xs font-semibold text-gray-800">
                            Delivered by {del.sellerName || 'Freelancer'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(del.createdAt)}
                        </span>
                      </div>

                      {del.notes && (
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {del.notes}
                        </div>
                      )}

                      {del.sourceUrl && (
                        <div className="pt-1">
                          <a
                            href={del.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl transition-colors border border-primary-100"
                          >
                            <ExternalLink size={13} />
                            <span>Open Source Deliverable: {del.sourceUrl}</span>
                          </a>
                        </div>
                      )}

                      {del.attachments && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {(() => {
                            try {
                              const files: string[] = JSON.parse(del.attachments);
                              return files.map((file, fileIdx) => (
                                <a
                                  key={fileIdx}
                                  href={file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                                >
                                  <LinkIcon size={12} />
                                  <span>Attachment #{fileIdx + 1}</span>
                                </a>
                              ));
                            } catch {
                              return (
                                <span className="text-xs text-gray-500">
                                  {del.attachments}
                                </span>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 2: MILESTONES ════ */}
          {activeTab === 'milestones' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Project Staged Milestones & Escrow Phases</h3>
                  <p className="text-xs text-gray-500">
                    Break down complex deliverables into progressive phases. Escrow funds for each milestone disburse immediately upon client approval.
                  </p>
                </div>

                {!isCompleted && !isCancelled && (
                  <button
                    onClick={() => setIsMilestoneModalOpen(true)}
                    className="btn-secondary btn-sm flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Plus size={15} /> Add Milestone
                  </button>
                )}
              </div>

              {milestones.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl mx-auto flex items-center justify-center">
                    <Layers size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">No staged milestones configured</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    This order is operating as a single complete deliverable for {formatPrice(order.amountTotal, order.currency)}. You can optionally divide it into staged payment phases.
                  </p>
                  <button
                    onClick={() => setIsMilestoneModalOpen(true)}
                    className="btn-secondary btn-sm inline-flex items-center gap-1.5 mt-2"
                  >
                    <Plus size={14} /> Add First Milestone
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Milestone Progress Bar Header */}
                  {(() => {
                    const approved = milestones.filter((m) => m.status === 'approved');
                    const releasedDollars = approved.reduce((acc, m) => acc + m.amount, 0);
                    const totalDollars = milestones.reduce((acc, m) => acc + m.amount, 0);
                    const pct = Math.round((approved.length / milestones.length) * 100);

                    return (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers size={14} className="text-primary-600" />
                            Milestone Completion: {approved.length} of {milestones.length} Phases Approved ({pct}%)
                          </span>
                          <span className="font-bold text-emerald-700">
                            {formatPrice(releasedDollars, order.currency)} Released / {formatPrice(totalDollars, order.currency)} Total
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Milestone Cards */}
                  <div className="space-y-4">
                    {milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`border rounded-2xl p-5 transition-all bg-white ${
                          m.status === 'approved'
                            ? 'border-emerald-200/80 bg-emerald-50/10'
                            : m.status === 'delivered'
                            ? 'border-amber-300 shadow-sm'
                            : m.status === 'revision_requested'
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-gray-200 hover:border-primary-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-gray-900">
                                Phase #{m.milestoneIndex}: {m.title}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  m.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : m.status === 'delivered'
                                    ? 'bg-amber-100 text-amber-900 animate-pulse'
                                    : m.status === 'revision_requested'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {m.status === 'approved'
                                  ? '✓ Approved & Released'
                                  : m.status === 'delivered'
                                  ? 'Delivered (Awaiting Client Review)'
                                  : m.status === 'revision_requested'
                                  ? 'Revision Requested'
                                  : 'Funded in Escrow'}
                              </span>
                            </div>

                            {m.description && (
                              <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
                                {m.description}
                              </p>
                            )}

                            {/* Deliverable Notes & Link */}
                            {m.deliverableNotes && (
                              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                                <span className="font-semibold text-gray-700 block">Freelancer Deliverable Notes:</span>
                                <p className="text-gray-600">{m.deliverableNotes}</p>
                              </div>
                            )}

                            {m.deliverableUrl && (
                              <a
                                href={m.deliverableUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline pt-0.5"
                              >
                                <span>Inspect Milestone Deliverable Link</span>
                                <ExternalLink size={13} />
                              </a>
                            )}

                            {/* Revision Feedback Notes */}
                            {m.revisionNotes && (
                              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/60 text-xs space-y-1">
                                <span className="font-bold text-rose-900 block">Client Revision Feedback:</span>
                                <p className="text-rose-800">{m.revisionNotes}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-lg font-black text-gray-900">
                                {formatPrice(m.amount, order.currency)}
                              </div>
                              <span className="text-[10px] text-gray-400">Escrow Value</span>
                            </div>

                            {/* Milestone Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Seller Deliver Button */}
                              {isSeller && (m.status === 'funded_in_escrow' || m.status === 'in_progress' || m.status === 'revision_requested') && (
                                <button
                                  onClick={() => {
                                    setSelectedMilestone(m);
                                    setIsDeliverMilestoneModalOpen(true);
                                  }}
                                  className="btn-primary btn-sm text-xs flex items-center gap-1.5"
                                >
                                  <Upload size={13} />
                                  <span>Submit Deliverable</span>
                                </button>
                              )}

                              {/* Buyer Actions */}
                              {isBuyer && m.status === 'delivered' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedMilestone(m);
                                      setIsMilestoneRevisionModalOpen(true);
                                    }}
                                    className="btn-secondary btn-sm text-xs text-rose-700 hover:bg-rose-50"
                                  >
                                    Request Revision
                                  </button>
                                  <button
                                    onClick={() => approveMilestoneMutation.mutate(m.id)}
                                    disabled={approveMilestoneMutation.isPending}
                                    className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Approve & Release ({formatPrice(m.amount, order.currency)})</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 3: REQUIREMENTS ════ */}
          {activeTab === 'requirements' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Project Requirements & Brief</h3>
                <p className="text-xs text-gray-500">
                  Detailed project specifications, brand assets, and target objectives provided by the client.
                </p>
              </div>

              {isBuyer ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Project Brief & Client Instructions
                    </label>
                    <textarea
                      value={requirementsInput}
                      onChange={(e) => setRequirementsInput(e.target.value)}
                      rows={6}
                      placeholder="Outline your project scope, required features, brand assets, references, and deadline expectations..."
                      className="input text-sm"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {order.requirementsSubmittedAt
                        ? `Last updated on ${formatDate(order.requirementsSubmittedAt)}`
                        : 'No requirements submitted yet. Freelancer waits for this brief.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => requirementsMutation.mutate(requirementsInput)}
                      disabled={requirementsMutation.isPending || !requirementsInput.trim()}
                      className="btn-primary btn-sm flex items-center gap-1.5"
                    >
                      <Send size={14} />
                      {requirementsMutation.isPending ? 'Saving...' : 'Submit Requirements to Freelancer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {order.requirements ? (
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {order.requirements}
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
                        <Clock size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">Waiting for Client Requirements</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        The client has not yet submitted their project brief. You can send them a direct reminder in chat.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 4: ACTIVITY & AUDIT TRAIL ════ */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Immutable Audit Trail</h3>
                <p className="text-xs text-gray-500">
                  Verified log of every order lifecycle transition, escrow release, and deliverable submission.
                </p>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {transitions.map((t) => (
                  <div key={t.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-primary-600 shadow-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {t.reason || `Status updated to ${t.toStatus}`}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatDate(t.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Triggered by: <span className="font-semibold text-gray-700">{t.triggeredByName || 'System'}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──── DOUBLE-BLIND TWO-SIDED REVIEW & REPUTATION HUB ──── */}
      {isCompleted && (
        <div className="space-y-6">
          {/* 1. Prompt to Review (If current user hasn't reviewed yet) */}
          {reviewStatus?.canReview && (
            <div className="bg-gradient-to-r from-primary-50 via-indigo-50 to-purple-50 border border-primary-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Star size={24} className="fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      Double-Blind System
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Lock size={12} /> Confidential Escrow
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">
                    {isBuyer ? `Rate Freelancer ${order.seller.name}` : `Rate Client ${order.buyer.name}`}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 max-w-xl">
                    Leave your honest feedback on {isBuyer ? 'Quality, Communication, and Punctuality' : 'Clarity and Collaboration'}. Feedback remains sealed and hidden until both parties review or 14 days elapse, preventing retaliatory scores.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="btn-primary py-3 px-6 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary-500/20 shrink-0 hover:scale-102 transition-all"
              >
                <Star size={16} />
                <span>Leave Double-Blind Review</span>
              </button>
            </div>
          )}

          {/* 2. Double-Blind Sealed Vault State (User has reviewed, but counterpart hasn't, or unrevealed) */}
          {reviewStatus?.myReview && !reviewStatus?.isRevealed && (
            <div className="bg-white border border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>Double-Blind Feedback Sealed</span>
                      <span className="badge-amber text-[10px] px-2 py-0.5 rounded-full">Encrypted in Escrow</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Your feedback is securely recorded. Neither party can view each other's rating until both complete their review.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-gray-400 block font-medium">Auto-reveal countdown</span>
                  <span className="text-sm font-extrabold text-amber-700">
                    {reviewStatus.daysLeftToReveal !== undefined && reviewStatus.daysLeftToReveal > 0
                      ? `${reviewStatus.daysLeftToReveal} days remaining`
                      : 'Unlocking soon'}
                  </span>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Your Review</p>
                    <p className="text-[11px] text-emerald-700">Submitted & Locked in Escrow</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {isBuyer ? `${order.seller.name}'s Review` : `${order.buyer.name}'s Review`}
                    </p>
                    <p className="text-[11px] text-gray-500">Awaiting submission (or auto-reveal timeout)</p>
                  </div>
                </div>
              </div>

              {/* Preview of User's Own Submitted Review */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Your Confidential Submission (Visible only to you)
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{formatDate(reviewStatus.myReview.createdAt)}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= reviewStatus.myReview!.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                    <span className="text-sm font-bold text-gray-900 ml-1">
                      {reviewStatus.myReview.rating}.0 / 5.0
                    </span>
                  </div>

                  {reviewStatus.myReview.wouldRecommend !== undefined && (
                    <span className="text-xs text-emerald-700 bg-emerald-100 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ThumbsUp size={12} /> {reviewStatus.myReview.wouldRecommend ? 'Recommended' : 'Not Recommended'}
                    </span>
                  )}
                </div>

                {reviewStatus.myReview.comment && (
                  <p className="text-xs text-gray-700 italic bg-white p-3 rounded-xl border border-gray-100">
                    "{reviewStatus.myReview.comment}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. Both Reviews Revealed & Unlocked */}
          {reviewStatus?.isRevealed && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Unlock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>Two-Sided Reviews Unlocked & Public</span>
                      <span className="badge-green text-[10px] px-2 py-0.5 rounded-full">Verified Complete</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Both parties have completed feedback. These ratings contribute to platform reputation and badges.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buyer's Review of Seller */}
                {reviewStatus.hasBuyerReviewed && (
                  <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                          {getInitials(order.buyer.name)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{order.buyer.name} (Client)</p>
                          <p className="text-[10px] text-gray-400">Reviewed Freelancer</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {reviewStatus.counterpartReview?.reviewType === 'BUYER_TO_SELLER'
                          ? formatDate(reviewStatus.counterpartReview.createdAt)
                          : reviewStatus.myReview?.reviewType === 'BUYER_TO_SELLER'
                          ? formatDate(reviewStatus.myReview.createdAt)
                          : ''}
                      </span>
                    </div>

                    {/* Breakdown Badges */}
                    {(() => {
                      const r = reviewStatus.myReview?.reviewType === 'BUYER_TO_SELLER'
                        ? reviewStatus.myReview
                        : reviewStatus.counterpartReview;
                      if (!r) return null;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={15}
                                  className={star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-bold text-gray-900">{r.rating}.0</span>
                            {r.wouldRecommend && (
                              <span className="ml-auto text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ThumbsUp size={10} /> Recommends
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 py-1 text-center">
                            {r.qualityRating && (
                              <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-500 block">Quality</span>
                                <span className="text-xs font-bold text-gray-900">{r.qualityRating}.0 ★</span>
                              </div>
                            )}
                            {r.communicationRating && (
                              <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-500 block">Communication</span>
                                <span className="text-xs font-bold text-gray-900">{r.communicationRating}.0 ★</span>
                              </div>
                            )}
                            {r.deadlineRating && (
                              <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-500 block">On-Time</span>
                                <span className="text-xs font-bold text-gray-900">{r.deadlineRating}.0 ★</span>
                              </div>
                            )}
                          </div>

                          {r.comment && (
                            <p className="text-xs text-gray-700 italic bg-white p-3 rounded-xl border border-gray-100">
                              "{r.comment}"
                            </p>
                          )}

                          {/* Seller Response */}
                          {r.sellerResponse ? (
                            <div className="bg-primary-50/70 p-3 rounded-xl border border-primary-100 text-xs">
                              <span className="font-bold text-primary-900 block mb-0.5">Response from {order.seller.name}:</span>
                              <p className="text-primary-800 italic">"{r.sellerResponse}"</p>
                            </div>
                          ) : isSeller && (
                            <div className="pt-2">
                              {!isSellerResponseOpen ? (
                                <button
                                  onClick={() => setIsSellerResponseOpen(true)}
                                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
                                >
                                  <MessageCircle size={13} /> Respond to this review
                                </button>
                              ) : (
                                <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                                  <textarea
                                    value={sellerResponseText}
                                    onChange={(e) => setSellerResponseText(e.target.value)}
                                    rows={2}
                                    placeholder="Write a professional response to this review..."
                                    className="input text-xs"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setIsSellerResponseOpen(false)}
                                      className="btn-secondary text-[11px] py-1 px-2.5"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => respondMutation.mutate({ id: r.id, response: sellerResponseText.trim() })}
                                      disabled={respondMutation.isPending || !sellerResponseText.trim()}
                                      className="btn-primary text-[11px] py-1 px-2.5"
                                    >
                                      {respondMutation.isPending ? 'Posting...' : 'Post Response'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Seller's Review of Buyer */}
                {reviewStatus.hasSellerReviewed && (
                  <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {getInitials(order.seller.name)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{order.seller.name} (Freelancer)</p>
                          <p className="text-[10px] text-gray-400">Reviewed Client</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {reviewStatus.counterpartReview?.reviewType === 'SELLER_TO_BUYER'
                          ? formatDate(reviewStatus.counterpartReview.createdAt)
                          : reviewStatus.myReview?.reviewType === 'SELLER_TO_BUYER'
                          ? formatDate(reviewStatus.myReview.createdAt)
                          : ''}
                      </span>
                    </div>

                    {/* Breakdown Badges */}
                    {(() => {
                      const r = reviewStatus.myReview?.reviewType === 'SELLER_TO_BUYER'
                        ? reviewStatus.myReview
                        : reviewStatus.counterpartReview;
                      if (!r) return null;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={15}
                                  className={star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-bold text-gray-900">{r.rating}.0</span>
                            {r.wouldRecommend && (
                              <span className="ml-auto text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ThumbsUp size={10} /> Recommends Client
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 py-1 text-center">
                            {r.clarityRating && (
                              <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-500 block">Brief Clarity</span>
                                <span className="text-xs font-bold text-gray-900">{r.clarityRating}.0 ★</span>
                              </div>
                            )}
                            {r.cooperationRating && (
                              <div className="bg-white p-2 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-500 block">Cooperation</span>
                                <span className="text-xs font-bold text-gray-900">{r.cooperationRating}.0 ★</span>
                              </div>
                            )}
                          </div>

                          {r.comment && (
                            <p className="text-xs text-gray-700 italic bg-white p-3 rounded-xl border border-gray-100">
                              "{r.comment}"
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── DISPUTE & ESCALATION FOOTER ──── */}
      {!isCompleted && !isCancelled && (
        <div className="border border-gray-200 rounded-3xl p-5 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
              <HelpCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">
                {order.status.toLowerCase() === 'disputed'
                  ? 'Active Dispute Case in Progress'
                  : 'Having trouble resolving an issue?'}
              </p>
              <p className="text-[11px] text-gray-500">
                {order.status.toLowerCase() === 'disputed'
                  ? 'Escrow is frozen while evidence is reviewed or mutual settlement is negotiated.'
                  : 'You can open a formal dispute for our 24/7 MarketForge arbitration team to step in.'}
              </p>
            </div>
          </div>
          {order.status.toLowerCase() === 'disputed' ? (
            <Link
              to={`/orders/${order.id}/dispute`}
              className="btn-primary btn-sm bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Scale size={14} /> Open Dispute Room
            </Link>
          ) : (
            <button
              onClick={() => setIsDisputeModalOpen(true)}
              className="btn-secondary btn-sm text-red-600 hover:bg-red-50 hover:border-red-200 text-xs self-start sm:self-auto"
            >
              Open Project Dispute
            </button>
          )}
        </div>
      )}

      {/* ════════════════════ MODALS ════════════════════ */}

      {/* 1. Deliver Work Modal */}
      {isDeliverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload size={20} className="text-primary-600" />
                Deliver Project Work
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Provide release notes, live URLs, repository links, or download links to your client.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Release Notes / Delivery Description *
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={4}
                  placeholder="Explain what has been completed, key instructions, credentials, or how to test..."
                  className="input text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Deliverable URL (Figma, GitHub, Demo, Drive)
                </label>
                <input
                  type="url"
                  value={deliverySourceUrl}
                  onChange={(e) => setDeliverySourceUrl(e.target.value)}
                  placeholder="https://github.com/org/repo or https://figma.com/..."
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Attachment Links
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={attachmentInput}
                    onChange={(e) => setAttachmentInput(e.target.value)}
                    placeholder="Paste download URL or screenshot..."
                    className="input text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="btn-secondary btn-sm px-3"
                  >
                    Add
                  </button>
                </div>

                {deliveryAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {deliveryAttachments.map((url, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <span className="truncate max-w-[200px]">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDeliverModalOpen(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deliverMutation.mutate({
                    notes: deliveryNotes,
                    sourceUrl: deliverySourceUrl || undefined,
                    attachments: deliveryAttachments.length > 0 ? deliveryAttachments : undefined,
                  })
                }
                disabled={deliverMutation.isPending || !deliveryNotes.trim()}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Upload size={14} />
                {deliverMutation.isPending ? 'Delivering...' : 'Submit Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Request Revision Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw size={20} className="text-amber-600" />
                Request Project Revisions
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Be specific about what needs adjustment so the freelancer can implement your feedback quickly.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Revision Reason
                </label>
                <select
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  className="input text-sm"
                >
                  <option value="Missing Requirements">Missing Original Requirements</option>
                  <option value="Bug or Execution Error">Bug, Code Error, or Broken Feature</option>
                  <option value="Design Mismatch">Visual / Design / Style Adjustments Needed</option>
                  <option value="Incomplete Deliverable">Deliverable is Incomplete</option>
                  <option value="Other">Other Specific Changes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Specific Revision Notes & Feedback *
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={5}
                  placeholder="List bullet points of what needs to be changed or fixed..."
                  className="input text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  revisionMutation.mutate({
                    reason: revisionReason,
                    notes: revisionNotes,
                  })
                }
                disabled={revisionMutation.isPending || !revisionNotes.trim()}
                className="btn-primary btn-sm bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                {revisionMutation.isPending ? 'Submitting...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Double-Blind Multi-Category Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 border border-gray-100 my-8">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-500 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                <Star size={32} className="fill-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {isBuyer ? `Rate Freelancer ${order.seller.name}` : `Rate Client ${order.buyer.name}`}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Double-blind feedback ensures fair, unbiased reviews that build long-term reputation.
              </p>
            </div>

            {/* Double-Blind Escrow Notice */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3 text-xs text-indigo-900">
              <Lock size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Double-Blind Guarantee:</span> Your review is sealed and encrypted in escrow. {isBuyer ? order.seller.name : order.buyer.name} cannot see your ratings or comments until they also submit feedback, preventing retaliatory bias.
              </div>
            </div>

            <div className="space-y-5">
              {/* Overall Star Rating */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-center space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Overall Experience Rating
                </label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-115 transition-transform"
                    >
                      <Star
                        size={32}
                        className={
                          star <= reviewRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-gray-300'
                        }
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-700">
                  {reviewRating === 5 && 'Outstanding Experience (5 / 5)'}
                  {reviewRating === 4 && 'Very Good Experience (4 / 5)'}
                  {reviewRating === 3 && 'Average Experience (3 / 5)'}
                  {reviewRating === 2 && 'Below Expectations (2 / 5)'}
                  {reviewRating === 1 && 'Unsatisfactory (1 / 5)'}
                </span>
              </div>

              {/* Sub-Category Ratings for Buyer */}
              {isBuyer ? (
                <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Detailed Performance Criteria
                  </h4>

                  {/* Quality of Delivery */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <div>
                      <p className="font-semibold text-gray-800">Quality of Delivery</p>
                      <p className="text-[10px] text-gray-500">Adherence to project scope & specifications</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setQualityRating(star)}
                          className="p-0.5 hover:scale-115 transition-transform"
                        >
                          <Star
                            size={18}
                            className={star <= qualityRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Communication & Responsiveness */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-800">Communication</p>
                      <p className="text-[10px] text-gray-500">Responsiveness, clarity, and regular updates</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCommunicationRating(star)}
                          className="p-0.5 hover:scale-115 transition-transform"
                        >
                          <Star
                            size={18}
                            className={star <= communicationRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deadlines & Punctuality */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-800">Deadlines & Punctuality</p>
                      <p className="text-[10px] text-gray-500">Delivered within agreed milestones</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setDeadlineRating(star)}
                          className="p-0.5 hover:scale-115 transition-transform"
                        >
                          <Star
                            size={18}
                            className={star <= deadlineRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Sub-Category Ratings for Seller Reviewing Buyer */
                <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Client Collaboration Criteria
                  </h4>

                  {/* Clarity of Requirements */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <div>
                      <p className="font-semibold text-gray-800">Clarity of Requirements</p>
                      <p className="text-[10px] text-gray-500">Clear briefs, reasonable scope, and prompt assets</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setClarityRating(star)}
                          className="p-0.5 hover:scale-115 transition-transform"
                        >
                          <Star
                            size={18}
                            className={star <= clarityRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Respect & Cooperation */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-800">Respect & Cooperation</p>
                      <p className="text-[10px] text-gray-500">Professionalism and prompt milestone approvals</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCooperationRating(star)}
                          className="p-0.5 hover:scale-115 transition-transform"
                        >
                          <Star
                            size={18}
                            className={star <= cooperationRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendation Choice */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-800">
                  {isBuyer ? 'Would you recommend this freelancer?' : 'Would you work with this client again?'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      wouldRecommend
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp size={13} /> Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      !wouldRecommend
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsDown size={13} /> No
                  </button>
                </div>
              </div>

              {/* Written Feedback Textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Written Feedback
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder={
                    isBuyer
                      ? "Share specific details about code quality, communication, and overall professionalism..."
                      : "Share specific details about working with this client, brief clarity, and prompt responses..."
                  }
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="btn-secondary btn-sm"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={() =>
                  reviewMutation.mutate({
                    orderId,
                    rating: reviewRating,
                    qualityRating: isBuyer ? qualityRating : undefined,
                    communicationRating: isBuyer ? communicationRating : undefined,
                    deadlineRating: isBuyer ? deadlineRating : undefined,
                    clarityRating: !isBuyer ? clarityRating : undefined,
                    cooperationRating: !isBuyer ? cooperationRating : undefined,
                    wouldRecommend,
                    comment: reviewComment.trim() || undefined,
                  })
                }
                disabled={reviewMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-primary-500/20"
              >
                <Lock size={14} />
                {reviewMutation.isPending ? 'Sealing Review in Escrow...' : 'Submit & Seal Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Dispute Modal */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} />
                Open MarketForge Dispute
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Disputes freeze the remaining escrow funds while our arbitration team reviews project logs.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Dispute
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="input text-sm"
                >
                  <option value="non_delivery">Freelancer Did Not Deliver</option>
                  <option value="poor_quality">Work Quality Severely Deviates From Scope</option>
                  <option value="unresponsive">Counterparty is Unresponsive</option>
                  <option value="fraud">Fraudulent or Malicious Submission</option>
                  <option value="other">Other Unresolved Conflict</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Detailed Explanation & Evidence *
                </label>
                <textarea
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what occurred, any agreements made, and what resolution you are requesting..."
                  className="input text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  disputeMutation.mutate({
                    orderId,
                    reason: disputeReason,
                    description: disputeDescription.trim() || undefined,
                  })
                }
                disabled={disputeMutation.isPending || !disputeDescription.trim()}
                className="btn-primary btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
              >
                <AlertTriangle size={14} />
                {disputeMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Milestone Modal */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Layers size={20} className="text-primary-600" />
                Add Project Milestone
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Define a specific phase, deliverable objective, and allocated escrow amount.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Phase 1: Wireframes & High-Fidelity UI"
                  className="input text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description & Deliverable Criteria
                </label>
                <textarea
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  rows={3}
                  placeholder="What will be provided to mark this milestone complete?"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Allocated Escrow Amount ($) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={milestoneAmount}
                  onChange={(e) => setMilestoneAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="100"
                  className="input text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  addMilestoneMutation.mutate({
                    title: milestoneTitle,
                    description: milestoneDesc || undefined,
                    amount: Number(milestoneAmount) || 10,
                  })
                }
                disabled={addMilestoneMutation.isPending || !milestoneTitle.trim() || !milestoneAmount}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Plus size={14} />
                {addMilestoneMutation.isPending ? 'Creating...' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Deliver Milestone Modal */}
      {isDeliverMilestoneModalOpen && selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload size={20} className="text-primary-600" />
                Submit Deliverable: Phase #{selectedMilestone.milestoneIndex}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Deliver files, links, and completion notes for: <strong>{selectedMilestone.title}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Deliverable Notes & Summary *
                </label>
                <textarea
                  value={milestoneDeliverNotes}
                  onChange={(e) => setMilestoneDeliverNotes(e.target.value)}
                  rows={4}
                  placeholder="Explain what has been completed, access details, and review instructions..."
                  className="input text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Deliverable / Asset Link (Optional)
                </label>
                <input
                  type="url"
                  value={milestoneDeliverUrl}
                  onChange={(e) => setMilestoneDeliverUrl(e.target.value)}
                  placeholder="https://github.com/... or Figma / Google Drive link"
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsDeliverMilestoneModalOpen(false);
                  setSelectedMilestone(null);
                }}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deliverMilestoneMutation.mutate({
                    milestoneId: selectedMilestone.id,
                    notes: milestoneDeliverNotes,
                    sourceUrl: milestoneDeliverUrl,
                  })
                }
                disabled={deliverMilestoneMutation.isPending || !milestoneDeliverNotes.trim()}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Upload size={14} />
                {deliverMilestoneMutation.isPending ? 'Submitting...' : 'Submit Phase Deliverable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Request Milestone Revision Modal */}
      {isMilestoneRevisionModalOpen && selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw size={20} className="text-rose-600" />
                Request Revision: Phase #{selectedMilestone.milestoneIndex}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Provide clear, actionable feedback for <strong>{selectedMilestone.title}</strong> so the freelancer can adjust their deliverable.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Specific Revision Notes & Requirements *
                </label>
                <textarea
                  value={milestoneRevisionNotes}
                  onChange={(e) => setMilestoneRevisionNotes(e.target.value)}
                  rows={4}
                  placeholder="Detail the exact adjustments, changes, or missing assets required..."
                  className="input text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsMilestoneRevisionModalOpen(false);
                  setSelectedMilestone(null);
                }}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  requestMilestoneRevisionMutation.mutate({
                    milestoneId: selectedMilestone.id,
                    notes: milestoneRevisionNotes,
                  })
                }
                disabled={requestMilestoneRevisionMutation.isPending || !milestoneRevisionNotes.trim()}
                className="btn-primary btn-sm bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                {requestMilestoneRevisionMutation.isPending ? 'Submitting...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. IP Assignment Certificate Modal */}
      <IpCertificateModal
        isOpen={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        orderId={orderId}
      />
    </div>
  );
}

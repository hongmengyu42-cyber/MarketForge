import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '@/api';
import { useAuthStore } from '@/store';
import { formatPrice, formatDate, getInitials } from '@/utils';
import type { Dispute } from '@/types';
import {
  Shield,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Send,
  Paperclip,
  Lock,
  DollarSign,
  ArrowLeft,
  MessageSquare,
  X,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DisputeResolutionPage() {
  const { id } = useParams<{ id: string }>();
  const disputeOrOrderId = Number(id);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [messageText, setMessageText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Settlement Offer Form State
  const [refundOffer, setRefundOffer] = useState<number>(0);
  const [releaseOffer, setReleaseOffer] = useState<number>(0);
  const [offerMessage, setOfferMessage] = useState('');

  // Fetch dispute data (supports both disputeId or orderId)
  const {
    data: disputeData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dispute-case', disputeOrOrderId],
    queryFn: async () => {
      try {
        const res = await disputesApi.getById(disputeOrOrderId);
        return res;
      } catch {
        // Fallback to lookup by orderId
        return await disputesApi.getByOrderId(disputeOrOrderId);
      }
    },
    enabled: !isNaN(disputeOrOrderId),
    refetchInterval: 8000,
  });

  const dispute: Dispute | undefined = disputeData?.data?.data;
  const isBuyer = user?.id === dispute?.buyerId;
  const isSeller = user?.id === dispute?.sellerId;
  const isAdmin = Boolean(user?.isAdmin);

  // Mutations
  const postMessageMutation = useMutation({
    mutationFn: (data: { body: string; attachmentUrl?: string; attachmentName?: string }) =>
      disputesApi.postMessage(dispute!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-case', disputeOrOrderId] });
      toast.success('Statement & evidence submitted');
      setMessageText('');
      setAttachmentUrl('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit message';
      toast.error(msg);
    },
  });

  const createOfferMutation = useMutation({
    mutationFn: (data: { refundAmount: number; releaseAmount: number; message?: string }) =>
      disputesApi.createSettlementOffer(dispute!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-case', disputeOrOrderId] });
      toast.success('Mutual settlement offer submitted to counterparty!');
      setShowOfferModal(false);
      setOfferMessage('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit offer';
      toast.error(msg);
    },
  });

  const respondOfferMutation = useMutation({
    mutationFn: ({ offerId, action }: { offerId: number; action: 'ACCEPT' | 'REJECT' }) =>
      disputesApi.respondToSettlementOffer(dispute!.id, offerId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-case', disputeOrOrderId] });
      queryClient.invalidateQueries({ queryKey: ['order-workspace'] });
      toast.success('Response recorded!');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-500">Connecting to MarketForge Arbitration Room...</p>
      </div>
    );
  }

  if (isError || !dispute) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Dispute Case Not Found</h2>
        <p className="text-sm text-gray-500">
          This dispute case could not be retrieved or you do not have permission to view it.
        </p>
        <Link to="/orders" className="btn-primary inline-flex items-center gap-2 text-sm mt-2">
          <ArrowLeft size={16} /> Return to Orders
        </Link>
      </div>
    );
  }

  const isResolved =
    dispute.status === 'resolved_refund' ||
    dispute.status === 'resolved_release' ||
    dispute.status === 'resolved_partial';

  const orderTotalCents = dispute.orderAmount || (dispute.order?.amountTotal ?? 0);
  const activeOffer = dispute.settlementOffers?.find((o) => o.status === 'PENDING');

  const openOfferModal = () => {
    // Default split: 50/50
    const half = Math.floor(orderTotalCents / 2);
    setRefundOffer(half);
    setReleaseOffer(orderTotalCents - half);
    setShowOfferModal(true);
  };

  const handleSliderChange = (newRefund: number) => {
    const clampedRefund = Math.max(0, Math.min(newRefund, orderTotalCents));
    setRefundOffer(clampedRefund);
    setReleaseOffer(orderTotalCents - clampedRefund);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* ──── BREADCRUMBS & CASE HEADER ──── */}
      <div className="space-y-4">
        <Link
          to={`/orders/${dispute.orderId}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100 transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft size={14} /> Back to Order Workspace #{dispute.orderNumber}
        </Link>

        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Scale size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                  Case #DSP-{dispute.id}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  Order #{dispute.orderNumber}
                </span>
                <span
                  className={`text-xs font-bold uppercase px-3 py-0.5 rounded-full ${
                    isResolved
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {dispute.status.replace('_', ' ')}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">
                Dispute Mediation & Arbitration Room
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Contested Service:{' '}
                <strong className="text-gray-800">{dispute.listingTitle || 'Deliverable'}</strong>
              </p>
            </div>
          </div>

          {/* Frozen Escrow Vault Callout */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200/90 rounded-2xl p-4 text-center sm:text-right shrink-0">
            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-amber-900">
              <Lock size={14} /> Escrow Funds Frozen
            </div>
            <div className="text-2xl font-black text-amber-950 mt-0.5">
              {formatPrice(orderTotalCents, dispute.currency)}
            </div>
            <span className="text-[11px] text-amber-700 block mt-0.5">
              Protected in third-party neutral escrow
            </span>
          </div>
        </div>
      </div>

      {/* ──── STAGE STEPPER ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            ✓
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">1. Dispute Opened</p>
            <p className="text-[11px] text-gray-500">Escrow frozen & logs preserved</p>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xs ${
            !isResolved
              ? 'bg-primary-50/70 border-primary-200 text-primary-900'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              !isResolved
                ? 'bg-primary-600 text-white animate-pulse'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isResolved ? '✓' : '2'}
          </div>
          <div>
            <p className="text-xs font-bold">2. Mutual Negotiation</p>
            <p className="text-[11px] opacity-80">Evidence exchange & split offers</p>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xs ${
            isResolved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-white border-gray-200 text-gray-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              isResolved ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isResolved ? '✓' : '3'}
          </div>
          <div>
            <p className="text-xs font-bold">3. Ruling / Settlement</p>
            <p className="text-[11px] opacity-80">Funds disbursed & ledger settled</p>
          </div>
        </div>
      </div>

      {/* ──── CASE REASON & PARTIES SUMMARY ──── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Dispute Statement of Claim
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
              Reason: {dispute.reason}
            </span>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
            {dispute.description || 'No initial written statement provided.'}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 pt-1">
            <span>
              Filed by: <strong className="text-gray-900">{dispute.raisedByName}</strong> ({dispute.raisedByRole})
            </span>
            <span>Filed on: {formatDate(dispute.createdAt)}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-3">
            Involved Parties
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                {getInitials(dispute.buyerName || 'B')}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">{dispute.buyerName}</p>
                <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.2 rounded-full">
                  Client (Buyer)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                {getInitials(dispute.sellerName || 'S')}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">{dispute.sellerName}</p>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.2 rounded-full">
                  Freelancer (Seller)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs">
                <Shield size={16} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900">
                  {dispute.assignedMediatorName || dispute.resolvedByAdminName || 'MarketForge Arbiter'}
                </p>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.2 rounded-full">
                  Neutral Arbitration Desk
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── OFFICIAL ARBITRATION RULING (WHEN RESOLVED) ──── */}
      {isResolved && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-md space-y-4 animate-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Official Arbitration Ruling & Escrow Settlement
                </span>
                <h3 className="text-lg font-black text-emerald-950">
                  Verdict: {dispute.status.replace('resolved_', '').toUpperCase()}
                </h3>
              </div>
            </div>

            <span className="text-xs text-emerald-700 font-medium self-start sm:self-auto">
              Resolved: {formatDate(dispute.resolvedAt || dispute.updatedAt || new Date().toISOString())}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-center">
              <span className="text-xs font-semibold text-gray-500 block">Buyer Refund</span>
              <span className="text-2xl font-black text-emerald-700">
                {formatPrice(dispute.refundAmount, dispute.currency)}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">Credited back to Client</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-center">
              <span className="text-xs font-semibold text-gray-500 block">Freelancer Payout</span>
              <span className="text-2xl font-black text-gray-900">
                {formatPrice(dispute.releaseAmount, dispute.currency)}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">Released to Freelancer earnings</p>
            </div>
          </div>

          {dispute.latestResolution?.rulingNotes && (
            <div className="bg-white/80 p-4 rounded-2xl border border-emerald-200/60 text-xs text-emerald-950 space-y-1">
              <span className="font-bold text-gray-900 block">Arbitrator Findings & Notes:</span>
              <p className="leading-relaxed italic">"{dispute.latestResolution.rulingNotes}"</p>
              <span className="text-[10px] text-gray-500 block pt-1">
                Signed by: {dispute.latestResolution.adminName || 'MarketForge Legal Mediation'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ──── MUTUAL SETTLEMENT SECTION (IF ACTIVE) ──── */}
      {!isResolved && (
        <div className="space-y-4">
          {/* Active Pending Offer Banner */}
          {activeOffer && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                      Active Settlement Offer Proposed by {activeOffer.proposedByName} ({activeOffer.proposedByRole})
                    </h4>
                    <p className="text-xs text-amber-800">
                      Both parties can resolve this dispute immediately by accepting this mutual split.
                    </p>
                  </div>
                </div>

                <span className="text-xs text-amber-700 font-medium">
                  {formatDate(activeOffer.createdAt)}
                </span>
              </div>

              {/* Split Breakdown */}
              <div className="grid grid-cols-2 gap-4 bg-white/80 p-4 rounded-2xl border border-amber-200/60 text-center">
                <div>
                  <span className="text-[11px] text-gray-500 block">Proposed Refund to Buyer</span>
                  <span className="text-xl font-black text-emerald-700">
                    {formatPrice(activeOffer.refundAmount, dispute.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 block">Proposed Release to Freelancer</span>
                  <span className="text-xl font-black text-gray-900">
                    {formatPrice(activeOffer.releaseAmount, dispute.currency)}
                  </span>
                </div>
              </div>

              {activeOffer.message && (
                <p className="text-xs text-gray-700 italic bg-white/70 p-3 rounded-xl border border-amber-100">
                  "{activeOffer.message}"
                </p>
              )}

              {/* Action Buttons */}
              {user?.id !== activeOffer.proposedById && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() =>
                      respondOfferMutation.mutate({ offerId: activeOffer.id, action: 'REJECT' })
                    }
                    disabled={respondOfferMutation.isPending}
                    className="btn-secondary btn-sm text-red-600 hover:bg-red-50"
                  >
                    <X size={14} /> Decline Offer
                  </button>
                  <button
                    onClick={() =>
                      respondOfferMutation.mutate({ offerId: activeOffer.id, action: 'ACCEPT' })
                    }
                    disabled={respondOfferMutation.isPending}
                    className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <Check size={14} /> Accept Settlement & Disburse Funds
                  </button>
                </div>
              )}

              {user?.id === activeOffer.proposedById && (
                <p className="text-xs text-gray-500 italic text-center sm:text-right">
                  Awaiting response from {isBuyer ? dispute.sellerName : dispute.buyerName}...
                </p>
              )}
            </div>
          )}

          {/* Propose Settlement Offer Button */}
          {!activeOffer && (isBuyer || isSeller) && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Want to propose a fast compromise?</h4>
                  <p className="text-xs text-gray-500">
                    Submit a mutual split offer. If {isBuyer ? dispute.sellerName : dispute.buyerName} accepts, funds disburse immediately.
                  </p>
                </div>
              </div>

              <button
                onClick={openOfferModal}
                className="btn-secondary py-2.5 px-5 rounded-2xl text-xs font-bold text-primary-700 border-primary-200 hover:bg-primary-50 shrink-0"
              >
                Propose Settlement Split
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──── MEDIATION EVIDENCE & DISCUSSION THREAD ──── */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">Case Evidence & Discussion Feed</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {dispute.messages?.length || 0} statements recorded
          </span>
        </div>

        {/* Messages Stream */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto bg-gray-50/50">
          {(!dispute.messages || dispute.messages.length === 0) ? (
            <p className="text-center py-8 text-xs text-gray-400">
              No evidence statements submitted yet. Use the box below to add your testimony.
            </p>
          ) : (
            dispute.messages.map((m) => {
              if (m.isSystemEvent) {
                return (
                  <div key={m.id} className="flex justify-center my-3">
                    <div className="max-w-md bg-amber-50/80 border border-amber-200 text-amber-900 text-xs px-4 py-2 rounded-2xl text-center shadow-xs">
                      <p className="whitespace-pre-line font-medium">{m.body}</p>
                      <span className="text-[10px] text-amber-600 mt-1 block font-mono">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              }

              const isMe = m.senderId === user?.id;
              const isMediator = m.senderRole === 'MEDIATOR';

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isMediator
                        ? 'bg-amber-500 text-white'
                        : m.senderRole === 'BUYER'
                        ? 'bg-primary-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {isMediator ? <Shield size={14} /> : getInitials(m.senderName)}
                  </div>

                  <div className={`max-w-lg space-y-1 ${isMe ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="font-bold text-gray-900">{m.senderName}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          isMediator
                            ? 'bg-amber-100 text-amber-800'
                            : m.senderRole === 'BUYER'
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {m.senderRole}
                      </span>
                      <span className="text-[10px] font-mono">{formatDate(m.createdAt)}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-primary-600 text-white shadow-xs rounded-tr-none'
                          : isMediator
                          ? 'bg-amber-50 border border-amber-200 text-gray-900 rounded-tl-none font-medium'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.body}</p>

                      {m.attachmentUrl && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 font-bold underline ${
                              isMe ? 'text-white' : 'text-primary-600'
                            }`}
                          >
                            <Paperclip size={12} /> {m.attachmentName || 'View Attachment'}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form (Only if active) */}
        {!isResolved ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!messageText.trim()) return;
              postMessageMutation.mutate({
                body: messageText.trim(),
                attachmentUrl: attachmentUrl.trim() || undefined,
                attachmentName: attachmentUrl.trim() ? 'Supporting Evidence Document' : undefined,
              });
            }}
            className="p-4 sm:p-5 border-t border-gray-100 bg-white space-y-3"
          >
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              placeholder={
                isAdmin
                  ? 'Issue official mediator instruction or request evidence from parties...'
                  : 'Submit your statement, counter-argument, or factual clarification...'
              }
              className="input text-xs"
              required
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Paperclip size={14} className="text-gray-400 shrink-0" />
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="Optional evidence link (Dropbox / Google Drive / URL)..."
                  className="input text-xs py-1.5 flex-1 sm:w-80"
                />
              </div>

              <button
                type="submit"
                disabled={postMessageMutation.isPending || !messageText.trim()}
                className="btn-primary btn-sm flex items-center gap-1.5 self-end sm:self-auto"
              >
                <Send size={13} />
                {postMessageMutation.isPending ? 'Posting...' : 'Post Statement'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
            This dispute case is formally closed. Statements are locked in the permanent arbitration archive.
          </div>
        )}
      </div>

      {/* ──── SETTLEMENT OFFER PROPOSAL MODAL ──── */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Scale size={18} className="text-primary-600" />
                Propose Mutual Settlement
              </h3>
              <button onClick={() => setShowOfferModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Total Escrow at Stake:{' '}
                <strong className="text-gray-900">{formatPrice(orderTotalCents, dispute.currency)}</strong>.
                Drag the slider or enter exact amounts to divide the escrow:
              </p>

              {/* Interactive Slider */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700">Buyer Refund: {formatPrice(refundOffer, dispute.currency)}</span>
                  <span className="text-gray-900">Seller Payout: {formatPrice(releaseOffer, dispute.currency)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={orderTotalCents}
                  step={100}
                  value={refundOffer}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />

                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>100% to Seller</span>
                  <span>50 / 50</span>
                  <span>100% to Buyer</span>
                </div>
              </div>

              {/* Message Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Settlement Explanation / Note (Optional)
                </label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={3}
                  placeholder="Explain why you believe this split is fair for both sides..."
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  createOfferMutation.mutate({
                    refundAmount: refundOffer,
                    releaseAmount: releaseOffer,
                    message: offerMessage.trim() || undefined,
                  })
                }
                disabled={createOfferMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Check size={14} />
                {createOfferMutation.isPending ? 'Sending Offer...' : 'Send Settlement Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

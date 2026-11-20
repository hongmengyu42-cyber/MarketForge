import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, messagingApi } from '@/api';
import { useAuthStore, useUIStore } from '@/store';
import { formatPrice, formatDate, getInitials, getMediaUrl } from '@/utils';
import type { JobPost, JobProposal } from '@/types';
import {
  Briefcase,
  ArrowLeft,
  ShieldCheck,
  FileText,
  User,
  Star,
  Send,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const [activeTab, setActiveTab] = useState<'details' | 'proposals'>('details');

  // Proposal submission form state (for freelancers)
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState<number | ''>(500);
  const [deliveryDays, setDeliveryDays] = useState<number | ''>(7);
  const [coverLetter, setCoverLetter] = useState('');

  // Fetch Job details
  const {
    data: jobData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['job-detail', slug],
    queryFn: () => jobsApi.getByIdOrSlug(slug!),
    enabled: !!slug,
  });

  const job: JobPost | undefined = jobData?.data?.data;

  // If user is client who posted, fetch incoming proposals
  const isClientOwner = user?.id === job?.client?.id || user?.isAdmin;
  const isFreelancer = isAuthenticated && !isClientOwner;

  const { data: proposalsData } = useQuery({
    queryKey: ['job-proposals', job?.id],
    queryFn: () => jobsApi.getProposals(job!.id),
    enabled: !!job?.id && isClientOwner,
  });

  const proposals: JobProposal[] = proposalsData?.data?.data || [];

  // Submit proposal mutation
  const submitProposalMutation = useMutation({
    mutationFn: (data: {
      bidAmount: number;
      deliveryDays: number;
      coverLetter: string;
    }) => jobsApi.submitProposal(job!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-detail', slug] });
      toast.success('Your proposal has been submitted to the client!');
      setIsProposalModalOpen(false);
      setCoverLetter('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit proposal';
      toast.error(msg);
    },
  });

  // Client updates proposal status
  const updateStatusMutation = useMutation({
    mutationFn: ({ proposalId, status }: { proposalId: number; status: string }) =>
      jobsApi.updateProposalStatus(proposalId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-proposals', job?.id] });
      toast.success('Candidate status updated');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update proposal';
      toast.error(msg);
    },
  });

  // Client hires candidate
  const hireMutation = useMutation({
    mutationFn: (proposalId: number) => jobsApi.hire(proposalId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['job-detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('🎉 Candidate hired! Escrow funded and project workspace created.');
      const orderId = res.data?.data?.id;
      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        navigate('/orders');
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to hire freelancer';
      toast.error(msg);
    },
  });

  // Start chat with freelancer
  const handleStartChat = async (freelancerId: number) => {
    try {
      const res = await messagingApi.startConversation({
        sellerId: freelancerId,
        body: `Hi! I saw your proposal for "${job?.title}" and would like to discuss next steps.`,
      });
      const convId = res.data?.data?.id;
      if (convId) {
        navigate(`/messages?conversationId=${convId}`);
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    }
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      openModal('auth');
      return;
    }
    if (job?.budgetAmount) {
      setBidAmount(job.budgetAmount);
    }
    setIsProposalModalOpen(true);
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount || Number(bidAmount) < 5) {
      toast.error('Bid amount must be at least $5');
      return;
    }
    if (!deliveryDays || Number(deliveryDays) < 1) {
      toast.error('Please enter a delivery turnaround of at least 1 day');
      return;
    }
    if (!coverLetter.trim() || coverLetter.length < 20) {
      toast.error('Please write a cover letter explaining your qualifications (minimum 20 characters)');
      return;
    }

    submitProposalMutation.mutate({
      bidAmount: Number(bidAmount),
      deliveryDays: Number(deliveryDays),
      coverLetter: coverLetter.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-44 bg-gray-200 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-3xl" />
          <div className="h-96 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
          <Briefcase size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Job Not Found</h2>
        <p className="text-sm text-gray-500">
          The job post you are looking for has been removed, closed, or does not exist.
        </p>
        <Link to="/jobs" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Job Board
        </Link>
      </div>
    );
  }

  const myProposal = job.myProposal;
  const isHired = job.status === 'HIRED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ──── BREADCRUMBS & TOP BAR ──── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Link to="/jobs" className="text-xs font-bold text-primary-600 hover:underline">
                Job Board
              </Link>
              {job.category && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{job.category.name}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
              {job.title}
            </h1>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isHired
              ? 'bg-purple-100 text-purple-800'
              : job.status === 'OPEN'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {job.status}
        </span>
      </div>

      {/* ──── CLIENT OWNER TABS (IF APPLICABLE) ──── */}
      {isClientOwner && (
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText size={16} /> Job Overview
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'proposals'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <User size={16} />
            <span>Incoming Proposals</span>
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {proposals.length}
            </span>
          </button>
        </div>
      )}

      {/* ──── CONTENT GRID ──── */}
      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Key Metrics Banner */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Budget
                </span>
                <div className="text-xl sm:text-2xl font-black text-gray-900">
                  {formatPrice(job.budgetAmount)}
                  {job.budgetType === 'HOURLY' && <span className="text-xs font-normal">/hr</span>}
                </div>
                <span className="text-xs text-emerald-600 font-medium">
                  {job.budgetType === 'HOURLY' ? 'Hourly' : 'Fixed Price'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Duration
                </span>
                <div className="text-base font-bold text-gray-900">
                  {job.duration || '1 to 3 months'}
                </div>
                <span className="text-xs text-gray-500">Estimated scope</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Experience
                </span>
                <div className="text-base font-bold text-gray-900 capitalize">
                  {job.experienceLevel?.toLowerCase()}
                </div>
                <span className="text-xs text-gray-500">Required level</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Proposals
                </span>
                <div className="text-xl sm:text-2xl font-black text-primary-600">
                  {job.proposalsCount}
                </div>
                <span className="text-xs text-gray-500">Candidates applied</span>
              </div>
            </div>

            {/* FREELANCER: MY PROPOSAL CARD (IF ALREADY APPLIED) */}
            {myProposal && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary-600" />
                    <span className="text-sm font-bold text-gray-900">
                      You Have Submitted a Proposal for this Project
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-100 text-primary-700">
                    {myProposal.status}
                  </span>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-600 pt-1">
                  <div>
                    Your Proposed Bid: <span className="font-bold text-gray-900">{formatPrice(myProposal.bidAmount)}</span>
                  </div>
                  <div>
                    Estimated Delivery: <span className="font-bold text-gray-900">{myProposal.deliveryDays} Days</span>
                  </div>
                  <div>
                    Applied on: <span className="text-gray-500">{formatDate(myProposal.createdAt)}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-700 bg-white/80 p-3 rounded-xl border border-blue-100/60 leading-relaxed italic">
                  "{myProposal.coverLetter}"
                </div>
              </div>
            )}

            {/* Job Description */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3">
                Project Scope & Deliverables
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {job.description}
              </div>
            </div>

            {/* Required Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-gray-900">Required Skills & Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Box for Freelancer */}
            {isFreelancer && !myProposal && !isHired && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Interested in this project?</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Submit a proposal detailing your turnaround time, approach, and bid price.
                  </p>
                </div>

                <button
                  onClick={handleApplyClick}
                  className="btn-primary w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <Send size={16} />
                  <span>Submit a Proposal</span>
                </button>
              </div>
            )}

            {/* About the Client Card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b pb-3">About the Client</h3>

              <div className="flex items-center gap-3">
                <div className="avatar w-12 h-12 text-sm font-bold bg-primary-100 text-primary-700 rounded-2xl ring-2 ring-white shadow-xs relative overflow-hidden flex items-center justify-center">
                  <span>{getInitials(job.client?.name || 'C')}</span>
                  {job.client?.avatarUrl && (
                    <img
                      src={getMediaUrl(job.client.avatarUrl)}
                      alt="Client"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      className="w-full h-full object-cover rounded-2xl absolute inset-0"
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{job.client?.name}</h4>
                  <p className="text-xs text-gray-500">{job.client?.email}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs text-gray-600 border-t border-gray-100">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <ShieldCheck size={16} />
                  <span>Payment Verified & Escrow Protected</span>
                </div>
                {job.client?.memberSince && (
                  <div>
                    Member since: <span className="font-medium text-gray-800">{formatDate(job.client.memberSince)}</span>
                  </div>
                )}
                <div>
                  Job Activity: <span className="font-medium text-gray-800">{job.proposalsCount} proposals received</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ──── CLIENT: PROPOSALS TAB ──── */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Incoming Candidate Proposals ({proposals.length})
              </h2>
              <p className="text-xs text-gray-500">
                Review applicant pitches, discuss project details, and hire with 1-click escrow release.
              </p>
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="card p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl mx-auto flex items-center justify-center">
                <FileText size={28} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">No proposals received yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Your job post is actively visible on the board. When qualified freelancers submit their proposals, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="bg-white border border-gray-200 rounded-3xl p-6 hover:border-primary-300 transition-all shadow-xs space-y-4"
                >
                  {/* Freelancer Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="avatar w-12 h-12 text-sm font-bold bg-primary-100 text-primary-700 rounded-2xl ring-2 ring-white shadow-xs relative overflow-hidden flex items-center justify-center">
                        <span>{getInitials(proposal.freelancer?.displayName || proposal.freelancer?.name || 'F')}</span>
                        {proposal.freelancer?.avatarUrl && (
                          <img
                            src={getMediaUrl(proposal.freelancer.avatarUrl)}
                            alt="Freelancer"
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            className="w-full h-full object-cover rounded-2xl absolute inset-0"
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-gray-900">
                            {proposal.freelancer?.displayName || proposal.freelancer?.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              proposal.status === 'ACCEPTED'
                                ? 'bg-purple-100 text-purple-800'
                                : proposal.status === 'SHORTLISTED'
                                ? 'bg-amber-100 text-amber-800'
                                : proposal.status === 'DECLINED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {proposal.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-gray-800">
                            {proposal.freelancer?.rating?.toFixed(1) || '5.0'}
                          </span>
                          <span>({proposal.freelancer?.reviewCount || 0} reviews)</span>
                        </div>
                      </div>
                    </div>

                    {/* Bid & Turnaround */}
                    <div className="flex items-center gap-6 sm:text-right">
                      <div>
                        <div className="text-[11px] text-gray-400 font-semibold uppercase">Proposed Bid</div>
                        <div className="text-xl font-black text-gray-900">
                          {formatPrice(proposal.bidAmount)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-gray-400 font-semibold uppercase">Turnaround</div>
                        <div className="text-base font-bold text-gray-900">
                          {proposal.deliveryDays} Days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pitch / Cover letter */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Applicant Cover Letter
                    </span>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                      {proposal.coverLetter}
                    </p>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartChat(proposal.freelancer.id)}
                        className="btn-secondary btn-sm flex items-center gap-1.5"
                      >
                        <MessageSquare size={14} className="text-primary-600" />
                        <span>Chat / Interview</span>
                      </button>

                      {proposal.status !== 'SHORTLISTED' && proposal.status !== 'ACCEPTED' && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              proposalId: proposal.id,
                              status: 'SHORTLISTED',
                            })
                          }
                          className="btn-secondary btn-sm text-amber-700 hover:bg-amber-50"
                        >
                          Shortlist
                        </button>
                      )}

                      {proposal.status !== 'DECLINED' && proposal.status !== 'ACCEPTED' && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              proposalId: proposal.id,
                              status: 'DECLINED',
                            })
                          }
                          className="btn-secondary btn-sm text-red-600 hover:bg-red-50"
                        >
                          Decline
                        </button>
                      )}
                    </div>

                    {proposal.status !== 'ACCEPTED' && !isHired && (
                      <button
                        onClick={() => hireMutation.mutate(proposal.id)}
                        disabled={hireMutation.isPending}
                        className="btn-primary btn-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <CheckCircle2 size={15} />
                        <span>{hireMutation.isPending ? 'Hiring...' : `Hire & Fund Escrow (${formatPrice(proposal.bidAmount)})`}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── MODAL: SUBMIT PROPOSAL ──── */}
      {isProposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Send size={20} className="text-primary-600" />
                Submit a Proposal for This Job
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Project: <span className="font-semibold text-gray-700">{job.title}</span>
              </p>
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Your Bid Amount ($) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="500"
                    className="input text-sm font-bold"
                    required
                  />
                  <span className="text-[10px] text-gray-400">
                    Net: {formatPrice(Number(bidAmount) * 0.9)} after 10% fee
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Turnaround (Days) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="7"
                    className="input text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Cover Letter & Qualifications *
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  placeholder="Introduce yourself, highlight relevant past experience, and pitch your solution for this project..."
                  className="input text-sm leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsProposalModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitProposalMutation.isPending}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Send size={14} />
                  {submitProposalMutation.isPending ? 'Submitting...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { walletApi } from '@/api';
import type { WalletData, WalletTransaction, PayoutRequest, InvoiceData } from '@/types';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  FileText,
  Printer,
  X,
  Search,
  ExternalLink,
  RefreshCw,
  Landmark
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatCurrency(amount?: number): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'ALL' | 'EARNINGS' | 'ESCROW' | 'WITHDRAWAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'STRIPE_CONNECT' | 'BANK_TRANSFER' | 'PAYPAL'>('STRIPE_CONNECT');
  const [destinationDetails, setDestinationDetails] = useState('');

  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [customStripeId, setCustomStripeId] = useState('');

  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<number | null>(null);

  // Fetch wallet data
  const { data: walletResp, isLoading, refetch } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletApi.getWallet(),
  });

  const wallet: WalletData = walletResp?.data?.data || {
    availableBalance: 0,
    pendingClearance: 0,
    inEscrow: 0,
    lifetimeEarnings: 0,
    totalWithdrawn: 0,
    totalSpent: 0,
    stripeConnected: false,
    stripeAccountId: undefined,
    defaultPayoutMethod: 'STRIPE_CONNECT',
    transactions: [],
    payoutRequests: [],
  };

  // Fetch invoice details when activeInvoiceOrder is set
  const { data: invoiceResp, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['invoice', activeInvoiceOrder],
    queryFn: () => walletApi.getInvoice(activeInvoiceOrder!),
    enabled: activeInvoiceOrder != null,
  });
  const invoice: InvoiceData | undefined = invoiceResp?.data?.data;

  // Mutations
  const payoutMutation = useMutation({
    mutationFn: (data: { amount: number; payoutMethod: string; destinationDetails?: string }) =>
      walletApi.requestPayout(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success(res?.data?.message || 'Withdrawal initiated successfully!');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setDestinationDetails('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Withdrawal request failed';
      toast.error(msg);
    },
  });

  const stripeConnectMutation = useMutation({
    mutationFn: (accountId?: string) => walletApi.connectStripe(accountId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success(res?.data?.message || 'Stripe account linked successfully!');
      setIsStripeModalOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to connect Stripe account';
      toast.error(msg);
    },
  });

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (amountNum < 10) {
      toast.error('Minimum withdrawal is $10.00');
      return;
    }
    if (amountNum > wallet.availableBalance) {
      toast.error(`Amount exceeds your available balance of ${formatCurrency(wallet.availableBalance)}`);
      return;
    }
    payoutMutation.mutate({
      amount: amountNum,
      payoutMethod: withdrawMethod,
      destinationDetails: destinationDetails || (withdrawMethod === 'STRIPE_CONNECT' ? wallet.stripeAccountId : undefined),
    });
  };

  const handleSetQuickPercentage = (percent: number) => {
    const calculated = (wallet.availableBalance * percent) / 100;
    setWithdrawAmount(calculated.toFixed(2));
  };

  // Filtered transactions
  const filteredTransactions = (wallet.transactions || []).filter((tx: WalletTransaction) => {
    if (filterType === 'EARNINGS' && tx.type !== 'ESCROW_RELEASE' && tx.type !== 'MILESTONE_RELEASE') return false;
    if (filterType === 'ESCROW' && tx.type !== 'ESCROW_CAPTURE') return false;
    if (filterType === 'WITHDRAWAL' && tx.type !== 'WITHDRAWAL') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = tx.title?.toLowerCase().includes(q);
      const matchOrder = tx.orderNumber?.toLowerCase().includes(q);
      const matchId = tx.id?.toLowerCase().includes(q);
      return matchTitle || matchOrder || matchId;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Escrow Wallet & Payouts
                  </h1>
                  <p className="text-sm text-gray-500">
                    Real-time escrow protection, milestone releases, and instant payouts via Stripe Connect.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => refetch()}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                title="Refresh balances"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsStripeModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                {wallet.stripeConnected ? 'Stripe Connected' : 'Connect Stripe'}
              </button>

              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={wallet.availableBalance <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw Funds
              </button>
            </div>
          </div>

          {/* Verification Shield Callout */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow Protection Guaranteed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              Direct ACH & Express Payouts Enabled
            </span>
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-gray-400" />
              Separated Client Holding Accounts
            </span>
          </div>
        </div>

        {/* 4 Balances KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Available */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Available to Payout
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(wallet.availableBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cleared funds ready for immediate withdrawal to your bank or debit card.
            </p>
          </div>

          {/* Card 2: Pending Clearance */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Pending Clearance
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(wallet.pendingClearance)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Delivered orders undergoing the standard 3-day client review safety period.
            </p>
          </div>

          {/* Card 3: In Escrow */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                Secured In Escrow
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(wallet.inEscrow)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Funds pre-funded by buyers and safely held in escrow during active order execution.
            </p>
          </div>

          {/* Card 4: Lifetime Earnings */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                Lifetime Earnings
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(wallet.lifetimeEarnings)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cumulative net earnings deposited to your account since joining MarketForge.
            </p>
          </div>
        </div>

        {/* Stripe Connect Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold">Stripe Connect Payout Routing</h2>
              {wallet.stripeConnected ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active & Verified
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Setup Required
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              {wallet.stripeConnected
                ? `Connected Stripe Express ID: ${wallet.stripeAccountId || 'acct_mf_express_verified'}. Payouts route automatically into your registered bank account.`
                : 'Link your Stripe Connect Express account to enable instant card payouts and bank transfers with 0% processing markup.'}
            </p>
          </div>

          <button
            onClick={() => setIsStripeModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
          >
            {wallet.stripeConnected ? 'Manage Stripe Account' : 'Connect Stripe Express'}
          </button>
        </div>

        {/* Unified Transaction Statement Ledger */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Wallet Activity & Statement Ledger</h2>
              <p className="text-xs text-gray-500">
                Detailed audit trail of escrow releases, milestones, fee deductions, and withdrawal transfers.
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search order or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 w-48 sm:w-56"
                />
              </div>

              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50 text-xs font-medium">
                {(['ALL', 'EARNINGS', 'ESCROW', 'WITHDRAWAL'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      filterType === tab
                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'ALL' && 'All'}
                    {tab === 'EARNINGS' && 'Earnings'}
                    {tab === 'ESCROW' && 'Escrow Holds'}
                    {tab === 'WITHDRAWAL' && 'Withdrawals'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Description & Reference</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-normal">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Loading financial ledger...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No transactions recorded in this period.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPositive = tx.type === 'ESCROW_RELEASE' || tx.type === 'MILESTONE_RELEASE';
                    const isWithdrawal = tx.type === 'WITHDRAWAL';
                    const isEscrow = tx.type === 'ESCROW_CAPTURE';

                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{tx.title}</div>
                          {tx.orderNumber && (
                            <Link
                              to={`/orders/${tx.orderId}`}
                              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-0.5"
                            >
                              Order #{tx.orderNumber} <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.type === 'ESCROW_RELEASE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Earning Released
                            </span>
                          )}
                          {tx.type === 'MILESTONE_RELEASE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Milestone Released
                            </span>
                          )}
                          {tx.type === 'ESCROW_CAPTURE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              Escrow Hold
                            </span>
                          )}
                          {tx.type === 'WITHDRAWAL' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                              Payout Transfer
                            </span>
                          )}
                          {tx.type === 'PLATFORM_FEE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                              Platform Fee
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              tx.status === 'COMPLETED'
                                ? 'text-emerald-700'
                                : tx.status === 'HELD_IN_ESCROW'
                                ? 'text-blue-700'
                                : tx.status === 'PROCESSING'
                                ? 'text-amber-700'
                                : 'text-gray-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                tx.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : tx.status === 'HELD_IN_ESCROW'
                                  ? 'bg-blue-500'
                                  : tx.status === 'PROCESSING'
                                  ? 'bg-amber-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                            {tx.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-600'
                                : isWithdrawal
                                ? 'text-rose-600'
                                : isEscrow
                                ? 'text-blue-600'
                                : 'text-gray-900'
                            }
                          >
                            {isPositive && '+'}
                            {isWithdrawal && '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {tx.orderId ? (
                            <button
                              onClick={() => setActiveInvoiceOrder(tx.orderId!)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> Invoice
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Past Payout Requests Table */}
        {wallet.payoutRequests && wallet.payoutRequests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Withdrawal Request Records</h2>
            <div className="divide-y divide-gray-100">
              {wallet.payoutRequests.map((payout: PayoutRequest) => (
                <div key={payout.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <span>{payout.payoutMethod?.replace('_', ' ')}</span>
                      <span className="text-xs font-mono text-gray-400">({payout.transactionReference})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Requested on {formatDate(payout.createdAt)}
                      {payout.destinationDetails && ` • Destination: ${payout.destinationDetails}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(payout.amount)}</div>
                    <span
                      className={`text-xs font-semibold ${
                        payout.status === 'COMPLETED'
                          ? 'text-emerald-600'
                          : payout.status === 'PROCESSING'
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ──── MODAL: Request Withdrawal ──── */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Withdraw Earnings</h3>
                  <p className="text-xs text-gray-500">Fast payout straight to your connected method</p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-5">
              {/* Available balance highlight */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Available Balance</p>
                  <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                    {formatCurrency(wallet.availableBalance)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSetQuickPercentage(100)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                >
                  Max (100%)
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Amount to Withdraw (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="10"
                    max={wallet.availableBalance}
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-bold text-gray-900"
                  />
                </div>
                {/* Quick percent pills */}
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSetQuickPercentage(p)}
                      className="flex-1 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Method select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payout Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/30">
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="STRIPE_CONNECT"
                      checked={withdrawMethod === 'STRIPE_CONNECT'}
                      onChange={() => setWithdrawMethod('STRIPE_CONNECT')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                        Stripe Connect Express
                      </div>
                      <p className="text-xs text-gray-500">Fast direct deposit or instant debit card transfer</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/30">
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="BANK_TRANSFER"
                      checked={withdrawMethod === 'BANK_TRANSFER'}
                      onChange={() => setWithdrawMethod('BANK_TRANSFER')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <Building className="w-4 h-4 text-emerald-600" />
                        Direct Bank Wire / ACH
                      </div>
                      <p className="text-xs text-gray-500">1-3 business days standard bank routing</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/30">
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="PAYPAL"
                      checked={withdrawMethod === 'PAYPAL'}
                      onChange={() => setWithdrawMethod('PAYPAL')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <ExternalLink className="w-4 h-4 text-blue-600" />
                        PayPal Account
                      </div>
                      <p className="text-xs text-gray-500">Sent directly to your PayPal registered email</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Destination details input */}
              {withdrawMethod !== 'STRIPE_CONNECT' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    {withdrawMethod === 'PAYPAL' ? 'PayPal Email Address' : 'Bank Account / IBAN details'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={withdrawMethod === 'PAYPAL' ? 'your-paypal@example.com' : 'Routing #, Account # or IBAN'}
                    value={destinationDetails}
                    onChange={(e) => setDestinationDetails(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutMutation.isPending}
                  className="w-1/2 py-2.5 rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {payoutMutation.isPending ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── MODAL: Stripe Connect Onboarding ──── */}
      {isStripeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Stripe Connect Express</h3>
                  <p className="text-xs text-gray-500">Direct payouts & automated tax compliance</p>
                </div>
              </div>
              <button
                onClick={() => setIsStripeModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  MarketForge partners with <strong>Stripe Express</strong> to deliver payouts directly to your local bank account or debit card in 130+ currencies with automated 1099 tax handling.
                </p>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant verification & zero setup fee
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Same-day transfers to supported debit cards
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Compliant escrow holding regulations
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Custom Stripe Account ID (Optional / Test Mode)
                </label>
                <input
                  type="text"
                  placeholder="e.g. acct_1N4xxxx or leave empty for auto-generation"
                  value={customStripeId}
                  onChange={(e) => setCustomStripeId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStripeModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => stripeConnectMutation.mutate(customStripeId || undefined)}
                  disabled={stripeConnectMutation.isPending}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                >
                  {stripeConnectMutation.isPending ? 'Connecting...' : 'Authorize Stripe'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──── MODAL: Printable Tax Invoice ──── */}
      {activeInvoiceOrder != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-200 overflow-hidden">
            {/* Modal action bar (hidden in print) */}
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between print:hidden">
              <span className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-400" /> MarketForge Tax Invoice
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setActiveInvoiceOrder(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div className="p-8 sm:p-10 space-y-8 bg-white text-gray-900" id="printable-invoice">
              {isInvoiceLoading || !invoice ? (
                <div className="py-16 text-center text-gray-400">Loading invoice document...</div>
              ) : (
                <>
                  {/* Top Branding & Invoice No */}
                  <div className="flex items-start justify-between border-b border-gray-200 pb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 text-white font-black text-lg flex items-center justify-center">
                          M
                        </div>
                        <span className="text-xl font-black tracking-tight text-gray-900">
                          Market<span className="text-primary-600">Forge</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Escrow Platform & Verified Freelance Marketplace</p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-gray-900">{invoice.invoiceNumber}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* Parties Details */}
                  <div className="grid grid-cols-2 gap-8 text-xs">
                    <div>
                      <h4 className="font-bold text-gray-400 uppercase tracking-wider mb-2">Billed By (Freelancer)</h4>
                      <p className="font-bold text-sm text-gray-900">{invoice.sellerDisplayName || invoice.sellerName}</p>
                      <p className="text-gray-600">{invoice.sellerEmail}</p>
                      <p className="text-gray-400 mt-1">Verified MarketForge Pro Seller</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To (Client)</h4>
                      <p className="font-bold text-sm text-gray-900">{invoice.buyerName}</p>
                      <p className="text-gray-600">{invoice.buyerEmail}</p>
                      <p className="text-gray-400 mt-1">Order Ref: {invoice.orderNumber}</p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                        <tr>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Escrow Status</th>
                          <th className="p-3 text-right">Gross Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="p-3 font-medium text-gray-900">
                            {invoice.serviceTitle}
                            <span className="block text-[11px] text-gray-500">Order #{invoice.orderNumber}</span>
                          </td>
                          <td className="p-3 text-right font-medium text-emerald-600">
                            {invoice.escrowStatus}
                          </td>
                          <td className="p-3 text-right font-bold text-gray-900">
                            {formatCurrency(invoice.subtotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Platform Escrow Fee (10%)</span>
                        <span className="font-medium text-gray-900">{formatCurrency(invoice.platformFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
                        <span>Seller Net Payout</span>
                        <span className="text-emerald-600">{formatCurrency(invoice.sellerPayoutAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Escrow Seal Footer */}
                  <div className="border-t border-gray-100 pt-6 flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <ShieldCheck className="w-4 h-4" /> MarketForge Cryptographic Escrow Audit Ledger
                    </div>
                    <div>Page 1 of 1 • System Generated</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

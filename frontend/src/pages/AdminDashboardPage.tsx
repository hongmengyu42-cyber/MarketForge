import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { formatPrice, formatDate, getInitials } from '@/utils';
import {
  Shield,
  Users,
  ShoppingBag,
  Layers,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Scale,
  BookOpen,
  Check,
  X,
  Mail,
  Eye,
  Wallet,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { DashboardStats, Dispute, Listing, User, EmailLog, PayoutRequest } from '@/types';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'listings' | 'orders' | 'payouts' | 'disputes' | 'emails'>('overview');
  const [payoutFilter, setPayoutFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);

  // Users filter state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Dispute resolution state
  const [resolvingDispute, setResolvingDispute] = useState<Dispute | null>(null);
  const [verdict, setVerdict] = useState<string>('refund_buyer');
  const [rulingNotes, setRulingNotes] = useState<string>('');
  const [customBuyerRefund, setCustomBuyerRefund] = useState<number>(0);
  const [customSellerPayout, setCustomSellerPayout] = useState<number>(0);

  // 1. Dashboard Stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getDashboardStats(),
  });
  const stats: DashboardStats = statsData?.data?.data || {
    totalUsers: 0,
    totalListings: 0,
    activeListings: 0,
    totalOrders: 0,
    activeOrders: 0,
    openDisputes: 0,
    totalRevenue: 0,
    ledgerAccounts: [],
    recentLedgerEntries: [],
    categoriesBreakdown: [],
  };

  // 2. Users Query
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, userRoleFilter],
    queryFn: () =>
      adminApi.getUsers({
        search: userSearch || undefined,
        isAdmin: userRoleFilter === 'admin' ? true : undefined,
      }),
    enabled: activeTab === 'users',
  });
  const users: User[] = usersData?.data?.data?.content || [];

  // 3. Listings Query
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: () => adminApi.getListings(),
    enabled: activeTab === 'listings',
  });
  const listings: Listing[] = listingsData?.data?.data?.content || [];

  // 4. Disputes Query
  const { data: disputesData, isLoading: disputesLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => adminApi.getDisputes(),
    enabled: activeTab === 'disputes',
  });
  const disputes: Dispute[] = disputesData?.data?.data?.content || [];

  // 5. Emails Query (Sprint 5)
  const { data: emailsData, isLoading: emailsLoading } = useQuery({
    queryKey: ['admin-emails'],
    queryFn: () => adminApi.getEmailLogs(),
    enabled: activeTab === 'emails',
    refetchInterval: 8000,
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const r = await adminApi.getOrders({ size: 50 });
      return r.data?.data?.content ?? [];
    },
    enabled: activeTab === 'orders',
  });

  const payoutsQuery = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const r = await adminApi.getPayouts();
      return (r.data?.data ?? []) as PayoutRequest[];
    },
    enabled: activeTab === 'payouts',
    refetchInterval: 10000,
  });
  const payouts: PayoutRequest[] = payoutsQuery.data ?? [];

  const payoutActionMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: string; notes?: string }) =>
      adminApi.payoutAction(id, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Payout action recorded successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payout action failed';
      toast.error(msg);
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const r = await adminApi.getAnalytics();
      return r.data?.data;
    },
    enabled: activeTab === 'overview',
    refetchInterval: 15000,
  });
  const analytics = analyticsQuery.data;
  const emailLogs: EmailLog[] = emailsData?.data?.data?.content || [];

  // Mutations
  const toggleRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      adminApi.toggleRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User privileges updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed';
      toast.error(msg);
    },
  });

  const moderateListingMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      adminApi.moderateListing(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      toast.success('Listing moderated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed';
      toast.error(msg);
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        verdict: string;
        rulingNotes: string;
        customBuyerRefundAmount?: number;
        customSellerPayoutAmount?: number;
      };
    }) => adminApi.resolveDispute(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Dispute resolved & ledger accounts settled');
      setResolvingDispute(null);
      setRulingNotes('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Resolution failed';
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <Shield className="text-primary-600" /> Platform Governance Console
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Superadmin overview: double-entry financial ledger, escrow health, moderation, and disputes.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-200 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview & Ledger
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Users ({stats.totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'listings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Listings ({stats.totalListings})
          </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'payouts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Wallet size={15} /> Payouts
              </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'disputes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Disputes ({stats.openDisputes})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'emails' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Email & Security Audit
          </button>
        </div>
      </div>

      {/* TAB 1: Overview & Financial Ledger */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Total Gross Volume</span>
                <DollarSign size={16} className="text-green-600" />
              </div>
              <div className="text-2xl font-black text-gray-900">
                {statsLoading ? '...' : `$${Number(stats.totalRevenue).toLocaleString()}`}
              </div>
              <p className="text-[11px] text-gray-400">Processed through Escrow</p>
            </div>

            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Active Orders</span>
                <ShoppingBag size={16} className="text-primary-600" />
              </div>
              <div className="text-2xl font-black text-gray-900">
                {stats.activeOrders} <span className="text-xs font-normal text-gray-400">/ {stats.totalOrders} total</span>
              </div>
              <p className="text-[11px] text-gray-400">In-progress deliverables</p>
            </div>

            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Active Listings</span>
                <Layers size={16} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-gray-900">
                {stats.activeListings} <span className="text-xs font-normal text-gray-400">/ {stats.totalListings} total</span>
              </div>
              <p className="text-[11px] text-gray-400">Published services</p>
            </div>

            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Open Disputes</span>
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-gray-900">{stats.openDisputes}</div>
              <p className="text-[11px] text-gray-400">Pending administrative review</p>
            </div>
          </div>

          {/* Platform Performance & Revenue Trajectory Chart (Phase 3) */}
          <div className="card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary-600" /> Platform Financial & User Growth Analytics
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Macro telemetry: 6-month GMV flow, 10% platform fee revenue, and user acquisition rate
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                  {analytics?.completionRate ?? 100}% Completion Rate
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  {analytics?.disputeRate ?? 0}% Dispute Rate
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly GMV & Revenue Chart */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Monthly GMV & 10% Platform Revenue ($)</span>
                  <span className="text-emerald-600 font-extrabold">
                    Net: {formatPrice(analytics?.netRevenue || 0)}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-40 border-b border-gray-100 pb-2 pt-4">
                  {(() => {
                    const trend = analytics?.monthlyTrend || [];
                    const maxGmv = Math.max(...trend.map((t: { gmv: number }) => t.gmv), 100);
                    return trend.map((item: { month: string; gmv: number; revenue: number; orderCount: number }, idx: number) => {
                      const heightPct = Math.max(8, Math.round((item.gmv / maxGmv) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                          <div className="text-[9px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatPrice(item.gmv)}
                          </div>
                          <div
                            className="w-full max-w-[42px] rounded-t-lg transition-all duration-300 group-hover:brightness-110 flex items-end justify-center pb-1 cursor-pointer"
                            style={{
                              height: `${heightPct}%`,
                              background: item.gmv > 0
                                ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                                : '#e2e8f0',
                            }}
                          >
                            {item.orderCount > 0 && (
                              <span className="text-[9px] font-bold text-white hidden sm:inline">
                                {item.orderCount}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-gray-500 truncate w-full text-center">
                            {item.month.split(' ')[0]}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Monthly User Signups Chart */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>New User Registrations Trajectory</span>
                  <span className="text-primary-600 font-extrabold">
                    Total: {stats.totalUsers}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-40 border-b border-gray-100 pb-2 pt-4">
                  {(() => {
                    const trend = analytics?.monthlyTrend || [];
                    const maxUsers = Math.max(...trend.map((t: { newUsers: number }) => t.newUsers), 10);
                    return trend.map((item: { month: string; newUsers: number }, idx: number) => {
                      const heightPct = Math.max(8, Math.round((item.newUsers / maxUsers) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                          <div className="text-[9px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            +{item.newUsers}
                          </div>
                          <div
                            className="w-full max-w-[42px] rounded-t-lg transition-all duration-300 group-hover:brightness-110 flex items-end justify-center pb-1 cursor-pointer"
                            style={{
                              height: `${heightPct}%`,
                              background: item.newUsers > 0
                                ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)'
                                : '#e2e8f0',
                            }}
                          >
                            {item.newUsers > 0 && (
                              <span className="text-[9px] font-bold text-white hidden sm:inline">
                                {item.newUsers}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-gray-500 truncate w-full text-center">
                            {item.month.split(' ')[0]}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Double-Entry Ledger Accounts */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={18} className="text-primary-600" /> Double-Entry Financial Ledger Balances
              </h2>
              <span className="text-xs text-gray-400 font-mono">GAAP Auditable</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.ledgerAccounts && stats.ledgerAccounts.length > 0 ? (
                stats.ledgerAccounts.map((acc, idx) => (
                  <div key={idx} className="p-4 rounded-xl border bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
                        {acc.code}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                        {acc.type}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{acc.name}</div>
                    <div className="text-xl font-bold text-gray-900">
                      ${Number(acc.balance).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-xs text-gray-400">
                  No ledger accounts loaded.
                </div>
              )}
            </div>
          </div>

          {/* Recent Ledger Audit Trail */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3">
              Recent Ledger Audit Transactions
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Account</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentLedgerEntries && stats.recentLedgerEntries.length > 0 ? (
                    stats.recentLedgerEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 font-mono text-gray-500">#{e.id}</td>
                        <td className="py-2.5 font-semibold text-gray-800">{e.accountCode}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                              e.entryType === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {e.entryType}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-gray-900">${Number(e.amount).toFixed(2)}</td>
                        <td className="py-2.5 text-gray-600 truncate max-w-xs">{e.description}</td>
                        <td className="py-2.5 text-gray-400">{formatDate(e.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No recent transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users Management */}
      {activeTab === 'users' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-primary-600" /> Platform User Directory
            </h2>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name or email..."
                className="input text-xs py-1.5 max-w-xs"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="input text-xs py-1.5 w-auto"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Roles</th>
                    <th className="pb-3">Risk Score</th>
                    <th className="pb-3">Joined</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="avatar w-7 h-7 text-[10px]">
                            {getInitials(u.name)}
                          </div>
                          <span className="font-semibold text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{u.email}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          {u.isAdmin && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                              Admin
                            </span>
                          )}
                          {u.isSeller && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                              Seller
                            </span>
                          )}
                          {!u.isAdmin && !u.isSeller && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                              Buyer
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-semibold ${
                            u.riskScore > 50 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {u.riskScore || 0}/100
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">{formatDate(u.createdAt)}</td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => toggleRoleMutation.mutate({ userId: u.id, role: 'admin' })}
                          className="btn-secondary btn-sm text-[11px] py-1"
                        >
                          {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => toggleRoleMutation.mutate({ userId: u.id, role: 'seller' })}
                          className="btn-secondary btn-sm text-[11px] py-1"
                        >
                          Toggle Seller
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Listings Moderation */}
      {activeTab === 'listings' && (
        <div className="card p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers size={20} className="text-primary-600" /> Listings Moderation Queue
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Review marketplace listings for quality, compliance, and terms of service.
            </p>
          </div>

          {listingsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {listings.map((l) => (
                <div key={l.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{l.title}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {l.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>Price: {formatPrice(l.priceAmount)}</span>
                      <span>•</span>
                      <span>Delivery: {l.deliveryDays}d</span>
                      <span>•</span>
                      <span>Category: {l.category?.name || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => moderateListingMutation.mutate({ id: l.id, action: 'approve' })}
                      className="btn-secondary btn-sm text-green-700 hover:bg-green-50 flex items-center gap-1"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => moderateListingMutation.mutate({ id: l.id, action: 'request_changes' })}
                      className="btn-secondary btn-sm text-amber-700 hover:bg-amber-50"
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => moderateListingMutation.mutate({ id: l.id, action: 'reject' })}
                      className="btn-secondary btn-sm text-red-700 hover:bg-red-50 flex items-center gap-1"
                    >
                      <X size={14} /> Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Disputes Arbitration */}
      
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Order Management</h2>
            <span className="text-xs text-gray-400">{ordersQuery.data?.length ?? 0} orders loaded</span>
          </div>
          {ordersQuery.isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading orders…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order #</th>
                    <th className="px-4 py-3 font-medium">Buyer</th>
                    <th className="px-4 py-3 font-medium">Seller</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(ordersQuery.data ?? []).map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-indigo-600">#{order.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{order.buyer?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{order.seller?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{order.listing?.title ?? 'Custom'}</td>
                      <td className="px-4 py-3 font-medium">${((order.amountTotal ?? 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                          order.status === 'RELEASED' ? 'bg-emerald-50 text-emerald-700' :
                          order.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                          order.status === 'DISPUTED' ? 'bg-orange-50 text-orange-700' :
                          order.status === 'DELIVERED' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 flex gap-1.5">
                        {order.status !== 'CANCELLED' && order.status !== 'RELEASED' && order.status !== 'REFUNDED' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Cancel order #${order.orderNumber}?`)) return;
                              await adminApi.orderAction(order.id, 'cancel', 'Admin cancelled');
                              ordersQuery.refetch();
                            }}
                            className="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors"
                          >Cancel</button>
                        )}
                        {(order.status === 'DELIVERED' || order.status === 'IN_PROGRESS') && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Force complete order #${order.orderNumber}?`)) return;
                              await adminApi.orderAction(order.id, 'complete');
                              ordersQuery.refetch();
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
                          >Complete</button>
                        )}
                        {order.status === 'CANCELLED' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Issue refund for order #${order.orderNumber}?`)) return;
                              await adminApi.orderAction(order.id, 'force_refund');
                              ordersQuery.refetch();
                            }}
                            className="px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-xs font-medium transition-colors"
                          >Refund</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(ordersQuery.data ?? []).length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">No orders found.</div>
              )}
            </div>
          )}
        </div>
      )}
      {/* TAB: Payouts & Disbursals (Phase 3) */}
      {activeTab === 'payouts' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wallet size={20} className="text-primary-600" /> Seller Withdrawal & Payout Management
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Audit and approve seller payouts across Stripe Connect Express, Bank Wire ACH, and PayPal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(['ALL', 'PENDING', 'COMPLETED', 'REJECTED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPayoutFilter(filter)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    payoutFilter === filter
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {payoutsQuery.isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading payout ledger...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">ID / Reference</th>
                    <th className="px-4 py-3">Seller / Beneficiary</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method & Destination</th>
                    <th className="px-4 py-3">Requested At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payouts
                    .filter((p) => payoutFilter === 'ALL' || p.status.toUpperCase() === payoutFilter)
                    .map((p) => {
                      const isPending = p.status.toUpperCase() === 'PENDING';
                      const isCompleted = p.status.toUpperCase() === 'COMPLETED';
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className="font-bold text-gray-900">#{p.id}</span>
                            <div className="text-gray-400 truncate max-w-[120px]">{p.transactionReference || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{p.userName || `User #${p.userId}`}</div>
                            <div className="text-xs text-gray-400">{p.userEmail || '—'}</div>
                          </td>
                          <td className="px-4 py-3 font-extrabold text-gray-900">
                            {formatPrice(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-semibold text-gray-800">
                              {p.payoutMethod.replace('_', ' ')}
                            </span>
                            <div className="text-gray-400 text-[11px] truncate max-w-[180px]">
                              {p.destinationDetails || 'Default account'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {formatDate(p.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isCompleted
                                  ? 'bg-green-100 text-green-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => payoutActionMutation.mutate({ id: p.id, action: 'approve' })}
                                  disabled={payoutActionMutation.isPending}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const notes = prompt('Enter rejection reason:') || undefined;
                                    payoutActionMutation.mutate({ id: p.id, action: 'reject', notes });
                                  }}
                                  disabled={payoutActionMutation.isPending}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {payouts.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">No payout requests recorded.</div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="card p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Scale size={20} className="text-primary-600" /> Dispute Arbitration Panel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Review contested deliverables and execute binding financial settlements.
            </p>
          </div>

          {disputesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle className="mx-auto text-green-500" size={36} />
              <h3 className="font-bold text-gray-800">No active disputes</h3>
              <p className="text-xs text-gray-500">All customer deliveries are running smoothly!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {disputes.map((d) => (
                <div key={d.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        Dispute #{d.id}
                      </span>
                      <span className="text-xs text-gray-500">Order #{d.order?.orderNumber}</span>
                    </div>
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {d.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500">Reason: <span className="font-bold text-gray-900">{d.reason}</span></p>
                      <p className="text-gray-700 mt-1">{d.description || 'No detailed description provided.'}</p>
                    </div>

                    <div className="md:text-right space-y-1">
                      <p className="text-gray-500">Raised by: <span className="font-semibold text-gray-800">{d.raisedBy?.name}</span></p>
                      <p className="font-bold text-gray-900 text-sm">Escrow Hold: {formatPrice(d.order?.amountTotal || 0)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <Link
                      to={`/orders/${d.order?.id || d.id}/dispute`}
                      className="btn-secondary btn-sm flex items-center gap-1.5 text-xs text-primary-700 hover:bg-primary-50"
                    >
                      <Scale size={14} /> Case & Evidence Room
                    </Link>

                    {d.status === 'open' && (
                      <button
                        onClick={() => {
                          setResolvingDispute(d);
                          const total = (d.order?.amountTotal || 0) / 100;
                          setCustomBuyerRefund(Math.round(total / 2));
                          setCustomSellerPayout(total - Math.round(total / 2));
                        }}
                        className="btn-primary btn-sm flex items-center gap-1.5"
                      >
                        <Scale size={14} /> Resolve & Settle Funds
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Email & Security Audit (Sprint 5) */}
      {activeTab === 'emails' && (
        <div className="card p-6 space-y-6">
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Mail size={20} className="text-primary-600" /> Transactional Email & Security Audit
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Real-time audit log of all automated security notices, milestone alerts, and escrow notifications.
              </p>
            </div>
          </div>

          {emailsLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading email delivery queue...</div>
          ) : emailLogs.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <Mail className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No transactional emails logged yet</p>
              <p className="text-xs text-gray-400">Emails dispatched for orders, escrow funding, and payouts appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Recipient</th>
                    <th className="pb-3">Event / Template</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {emailLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 text-gray-500 whitespace-nowrap">{formatDate(item.sentAt)}</td>
                      <td className="py-3">
                        <div className="font-semibold text-gray-900">{item.recipientName || 'User'}</div>
                        <div className="text-gray-400 text-[11px]">{item.recipientEmail}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.templateType || 'TRANSACTIONAL'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-gray-800 max-w-xs truncate">{item.subject}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SENT' || item.status === 'SIMULATED_SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status === 'SIMULATED_SUCCESS' ? '✓ Delivered (Sandbox)' : item.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setPreviewEmail(item)}
                          className="btn-secondary btn-sm text-[11px] py-1 px-2.5 flex items-center gap-1 inline-flex"
                        >
                          <Eye size={12} /> Preview HTML
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Transactional Email Preview</h3>
                <p className="text-xs text-gray-500">To: {previewEmail.recipientEmail} • Subject: {previewEmail.subject}</p>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-xl p-2 bg-slate-50">
              {previewEmail.htmlBody ? (
                <iframe
                  title="Email Body Preview"
                  srcDoc={previewEmail.htmlBody}
                  className="w-full h-96 rounded-lg bg-white border-0"
                />
              ) : (
                <div className="p-8 text-center text-xs text-gray-400">No HTML payload available.</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setPreviewEmail(null)} className="btn-secondary btn-sm">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {resolvingDispute && (
        <div className="modal-overlay" onClick={() => setResolvingDispute(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Scale size={20} className="text-primary-600" /> Arbitrate Dispute #{resolvingDispute.id}
              </h3>
              <button onClick={() => setResolvingDispute(null)}><X size={20} /></button>
            </div>

            <div className="modal-body space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex justify-between items-center">
                <span>Escrow at Stake:</span>
                <strong className="text-sm font-bold text-gray-900">
                  {formatPrice(resolvingDispute.order?.amountTotal || 0)}
                </strong>
              </div>

              <div>
                <label className="label">Arbitration Verdict</label>
                <select
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value)}
                  className="input text-sm"
                >
                  <option value="refund_buyer">Refund Buyer (100% refund from Escrow)</option>
                  <option value="payout_seller">Payout Seller (100% release deliverable)</option>
                  <option value="split_50_50">Split 50 / 50 (Fair compromise)</option>
                  <option value="custom_split">Custom Split ($X Refund / $Y Payout)</option>
                </select>
              </div>

              {verdict === 'custom_split' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Buyer Refund ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customBuyerRefund}
                      onChange={(e) => setCustomBuyerRefund(Number(e.target.value))}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Seller Payout ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customSellerPayout}
                      onChange={(e) => setCustomSellerPayout(Number(e.target.value))}
                      className="input text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Official Ruling Notes (Permanent record)</label>
                <textarea
                  value={rulingNotes}
                  onChange={(e) => setRulingNotes(e.target.value)}
                  rows={4}
                  placeholder="State the findings, contractual terms evaluated, and reason for the ruling..."
                  className="input text-sm"
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setResolvingDispute(null)} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={() =>
                  resolveDisputeMutation.mutate({
                    id: resolvingDispute.id,
                    data: {
                      verdict,
                      rulingNotes,
                      customBuyerRefundAmount:
                        verdict === 'custom_split' ? Math.round(customBuyerRefund * 100) : undefined,
                      customSellerPayoutAmount:
                        verdict === 'custom_split' ? Math.round(customSellerPayout * 100) : undefined,
                    },
                  })
                }
                disabled={resolveDisputeMutation.isPending || !rulingNotes.trim()}
                className="btn-primary btn-sm"
              >
                {resolveDisputeMutation.isPending ? 'Executing Ledger Settle...' : 'Execute Binding Verdict'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

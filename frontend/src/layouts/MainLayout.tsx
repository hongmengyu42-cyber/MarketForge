import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, messagingApi, authApi } from '@/api';
import { wsService } from '@/services/websocket';
import toast from 'react-hot-toast';
import {
  Bell,
  LogOut,
  ShoppingBag,
  Palette,
  Shield,
  User,
  MessageSquare,
  PlusCircle,
  Briefcase,
  Wallet,
  Award,
  Heart,
  CheckCheck,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { getInitials } from '@/utils';
import type { Notification } from '@/types';

export default function MainLayout() {
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();
  const { openModal } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const { token } = useAuthStore();

  // ⚡ Live WebSocket Handshake & Global Notification Streaming
  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect(token);

      // 1. Live Notification Stream
      const unsubNotifs = wsService.subscribe('/user/queue/notifications', (notif: Notification) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                if (notif.link) navigate(notif.link);
              }}
              className={`${
                t.visible ? 'animate-in fade-in zoom-in-95' : 'animate-out fade-out'
              } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-3.5 cursor-pointer border-l-4 border-primary-600 transition-all hover:scale-102 duration-150`}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{notif.title}</p>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{notif.message}</p>
                </div>
              </div>
            </div>
          ),
          { duration: 5000, position: 'top-right' }
        );
      });

      // 2. Live Incoming Message & Chat Alert Stream
      const unsubMessages = wsService.subscribe('/user/queue/messages', (msg: any) => {
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });

        if (!window.location.pathname.startsWith('/messages')) {
          toast(
            () => (
              <div
                onClick={() => navigate('/messages')}
                className="cursor-pointer flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  💬
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-primary-600 block truncate">
                    {msg.sender?.name ? `Message from ${msg.sender.name}` : 'New message in chat'}
                  </span>
                  <span className="text-xs text-gray-600 line-clamp-1">
                    {msg.body || 'Proposed a custom offer'}
                  </span>
                </div>
              </div>
            ),
            { duration: 4000, position: 'bottom-right' }
          );
        }
      });

      // 3. Live Unread Count Stream
      const unsubUnread = wsService.subscribe('/user/queue/unread-count', () => {
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      });

      return () => {
        unsubNotifs();
        unsubMessages();
        unsubUnread();
      };
    } else {
      wsService.disconnect();
    }
  }, [isAuthenticated, token, navigate, queryClient]);

  // Synchronize fresh user profile and permissions (e.g. isAdmin, isSeller)
  useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await authApi.me();
      if (res?.data?.data) {
        updateUser(res.data.data);
      }
      return res.data?.data;
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.data?.data?.count || 0;

  const { data: notificationsData, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ page: 0, size: 20 }),
    enabled: isAuthenticated && isNotificationsOpen,
  });
  const notifications: Notification[] = notificationsData?.data?.data?.content || [];

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.readAt) {
      markReadMutation.mutate(notif.id);
    }
    setIsNotificationsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type?: string, title?: string) => {
    const combined = ((type || '') + ' ' + (title || '')).toLowerCase();
    if (combined.includes('order')) return <ShoppingBag size={15} className="text-primary-600" />;
    if (combined.includes('message') || combined.includes('chat')) return <MessageSquare size={15} className="text-blue-600" />;
    if (combined.includes('badge') || combined.includes('assessment')) return <Award size={15} className="text-amber-500" />;
    if (combined.includes('wallet') || combined.includes('payout') || combined.includes('escrow') || combined.includes('payment')) return <Wallet size={15} className="text-emerald-600" />;
    return <Bell size={15} className="text-purple-600" />;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notificationTab === 'unread') return !n.readAt;
    return true;
  });

  const { data: unreadMessagesData } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: () => messagingApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 8000,
  });
  const unreadMessagesCount = unreadMessagesData?.data?.data?.totalUnread || 0;
  const userAvatar = user?.avatarUrl || user?.sellerProfile?.avatarUrl;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Brand & Primary Navigation */}
            <div className="flex items-center gap-6 lg:gap-8 min-w-0">
              {/* Brand Logo */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                <img
                  src="/logo.png"
                  alt="MarketForge"
                  className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
                />
              </Link>

              {/* Primary Nav Links */}
              <nav className="hidden lg:flex items-center gap-6 shrink-0">
                <Link
                  to="/"
                  className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                    location.pathname === '/' || location.pathname === '/home'
                      ? 'text-primary-600 font-bold'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/services"
                  className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                    location.pathname === '/services' || location.pathname === '/explore'
                      ? 'text-primary-600 font-bold'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  Services
                </Link>
                <Link
                  to="/jobs"
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    location.pathname.startsWith('/jobs')
                      ? 'text-primary-600 font-bold'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  <Briefcase size={15} /> Job Board
                </Link>
                <Link
                  to="/assessments"
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    location.pathname === '/assessments'
                      ? 'text-primary-600 font-bold'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  <Award size={15} /> Skill Badges
                </Link>
                <Link
                  to="/contact"
                  className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                    location.pathname === '/contact'
                      ? 'text-primary-600 font-bold'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  Contact Us
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/orders"
                    className={`text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      location.pathname.startsWith('/orders')
                        ? 'text-primary-600 font-bold'
                        : 'text-gray-600 hover:text-primary-600'
                    }`}
                  >
                    <ShoppingBag size={15} /> Orders
                  </Link>
                )}
              </nav>
            </div>

            {/* Right: Actions, Utilities & Profile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isAuthenticated ? (
                <>
                  {/* Seller Studio Pill */}
                  <Link
                    to="/seller-studio"
                    className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all whitespace-nowrap shrink-0"
                  >
                    <Palette size={14} className="text-primary-600" />
                    <span>Seller Studio</span>
                  </Link>

                  {/* Wishlist Link */}
                  <Link
                    to="/saved"
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-xl hover:bg-gray-100 shrink-0"
                    title="Saved Services & Wishlist"
                  >
                    <Heart size={19} />
                  </Link>

                  {/* Messages Link */}
                  <Link
                    to="/messages"
                    className="relative p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-xl hover:bg-gray-100 shrink-0"
                    title="Messages & Chat"
                  >
                    <MessageSquare size={19} />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </Link>

                  {/* Notification Center Popover */}
                  <div className="relative shrink-0" ref={notifRef}>
                    <button
                      onClick={() => setIsNotificationsOpen((prev) => !prev)}
                      className={`relative p-2 transition-colors rounded-xl ${
                        isNotificationsOpen
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Notifications"
                    >
                      <Bell size={19} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {/* Popover Header */}
                        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                              <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markAllReadMutation.mutate()}
                              disabled={markAllReadMutation.isPending}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                            >
                              <CheckCheck size={14} /> Mark all read
                            </button>
                          )}
                        </div>

                        {/* Popover Filter Tabs */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/70 border-b border-gray-100">
                          <button
                            onClick={() => setNotificationTab('all')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                              notificationTab === 'all'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            All ({notifications.length})
                          </button>
                          <button
                            onClick={() => setNotificationTab('unread')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                              notificationTab === 'unread'
                                ? 'bg-white text-primary-600 shadow-xs'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Unread ({unreadCount})
                          </button>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                          {isLoadingNotifications ? (
                            <div className="p-4 space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                                  <div className="space-y-1.5 flex-1">
                                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : filteredNotifications.length === 0 ? (
                            <div className="py-8 text-center px-4">
                              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
                                <Bell size={18} />
                              </div>
                              <p className="text-sm font-medium text-gray-700">No notifications</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {notificationTab === 'unread'
                                  ? "You're all caught up with unread messages!"
                                  : 'Activity on orders and chats will appear here.'}
                              </p>
                            </div>
                          ) : (
                            filteredNotifications.map((notif) => {
                              const isUnread = !notif.readAt;
                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => handleNotificationClick(notif)}
                                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-gray-50 ${
                                    isUnread ? 'bg-primary-50/30' : 'bg-white'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                    {getNotificationIcon(notif.type, notif.title)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className={`text-xs font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {notif.title}
                                      </p>
                                      <span className="text-[10px] text-gray-400 shrink-0">
                                        {formatRelativeTime(notif.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                                      {notif.message}
                                    </p>
                                  </div>
                                  {isUnread && (
                                    <div className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" title="Unread" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile Menu */}
                  <div className="relative group shrink-0">
                    <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={user?.name || 'User'}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(user?.name || 'U')}
                        </div>
                      )}
                      <span className="hidden sm:inline-block text-xs font-semibold text-gray-800 max-w-[110px] truncate whitespace-nowrap">
                        {user?.name}
                      </span>
                      <ChevronDown size={14} className="text-gray-400 hidden sm:block shrink-0" />
                    </button>

                    <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-50">
                      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2.5">
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={user?.name || 'User'}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(user?.name || 'U')}
                          </div>
                        )}
                        <div className="overflow-hidden min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/profile"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User size={16} /> View Profile
                      </Link>
                      <Link
                        to="/seller-studio"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Palette size={16} /> Seller Studio
                      </Link>
                      <Link
                        to="/orders"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <ShoppingBag size={16} /> My Orders
                      </Link>
                      <Link
                        to="/saved"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Heart size={16} /> Saved Services
                      </Link>
                      <Link
                        to="/wallet"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Wallet size={16} /> Wallet & Escrow
                      </Link>
                      <Link
                        to="/assessments"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Award size={16} /> Skill Assessments
                      </Link>
                      <Link
                        to="/jobs/new"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 transition-colors"
                      >
                        <PlusCircle size={16} /> Post a Job
                      </Link>
                      <Link
                        to="/messages"
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare size={16} /> Messages & Chat
                        </span>
                        {unreadMessagesCount > 0 && (
                          <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {unreadMessagesCount}
                          </span>
                        )}
                      </Link>
                      {user?.isAdmin && (
                        <Link
                          to="/admin"
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Shield size={16} /> Admin Portal
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50">
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => openModal('auth')} className="btn-secondary btn-sm">
                    Sign In
                  </button>
                  <button onClick={() => openModal('auth')} className="btn-primary btn-sm">
                    Get Started
                  </button>
                </>
              )}

              {/* Mobile Hamburger Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                location.pathname === '/' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Home
            </Link>
            <Link
              to="/services"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                location.pathname === '/services' || location.pathname === '/explore' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Services
            </Link>
            <Link
              to="/jobs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                location.pathname.startsWith('/jobs') ? 'text-primary-600 bg-primary-50/50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Briefcase size={16} /> Job Board
            </Link>
            <Link
              to="/assessments"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                location.pathname === '/assessments' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Award size={16} /> Skill Badges
            </Link>
            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                location.pathname === '/contact' ? 'text-primary-600 bg-primary-50/50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Contact Us
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ShoppingBag size={16} /> Orders
                </Link>
                <Link
                  to="/seller-studio"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Palette size={16} /> Seller Studio
                </Link>
                <Link
                  to="/saved"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Heart size={16} /> Saved Services
                </Link>
                <Link
                  to="/wallet"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Wallet size={16} /> Wallet & Escrow
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content with Route Transition Automation */}
      <main className="flex-1">
        <div key={location.pathname} className="animate-page-enter w-full">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="MarketForge" className="h-7 w-auto object-contain opacity-90" />
              <span className="text-xs text-gray-300">|</span>
              <p className="text-xs text-gray-500">© 2026 MarketForge. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

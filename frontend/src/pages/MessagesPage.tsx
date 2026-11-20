import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { messagingApi } from '@/api';
import { useAuthStore } from '@/store';
import { formatPrice, getInitials, formatDate } from '@/utils';
import type { Conversation, Message, CustomOffer } from '@/types';
import { wsService } from '@/services/websocket';
import {
  MessageSquare,
  Send,
  Search,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  DollarSign,
  ExternalLink,
  X,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(() => {
    const id = searchParams.get('conversationId');
    return id ? Number(id) : null;
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  // Custom offer form state
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerPrice, setOfferPrice] = useState<number | ''>(100);
  const [offerDays, setOfferDays] = useState<number>(3);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations list
  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingApi.getConversations(),
    refetchInterval: 5000,
  });

  const conversations: Conversation[] = conversationsData?.data?.data || [];

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      const paramId = searchParams.get('conversationId');
      if (paramId) {
        setActiveConversationId(Number(paramId));
      } else {
        setActiveConversationId(conversations[0].id);
      }
    }
  }, [conversations, activeConversationId, searchParams]);

  // Sync activeConversationId with URL param
  const selectConversation = (id: number) => {
    setActiveConversationId(id);
    setSearchParams({ conversationId: String(id) });
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // 2. Fetch Messages for active conversation
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => (activeConversationId ? messagingApi.getMessages(activeConversationId) : null),
    enabled: !!activeConversationId,
    refetchInterval: 3000,
  });

  const messages: Message[] = messagesData?.data?.data || [];

  // 3. Fetch Custom Offers for active conversation
  const { data: offersData, refetch: refetchOffers } = useQuery({
    queryKey: ['custom-offers', activeConversationId],
    queryFn: () => (activeConversationId ? messagingApi.getCustomOffers(activeConversationId) : null),
    enabled: !!activeConversationId,
    refetchInterval: 5000,
  });

  const offers: CustomOffer[] = offersData?.data?.data || [];

  // Mark conversation as read when active
  useEffect(() => {
    if (activeConversationId && activeConversation?.unreadCount && activeConversation.unreadCount > 0) {
      messagingApi.markAsRead(activeConversationId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });
    }
  }, [activeConversationId, activeConversation?.unreadCount, queryClient]);

  const [partnerTyping, setPartnerTyping] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ⚡ Live WebSocket Subscriptions for 0ms Active Chat Streaming
  useEffect(() => {
    if (!activeConversationId) return;

    // 1. Live Chat Message Inflow
    const unsubMessages = wsService.subscribe(`/topic/conversations/${activeConversationId}`, (newMsg: Message) => {
      queryClient.setQueryData(['messages', activeConversationId], (oldData: any) => {
        const currentList: Message[] = oldData?.data?.data || [];
        if (currentList.some((m) => m.id === newMsg.id)) {
          return oldData;
        }
        return {
          ...oldData,
          data: {
            ...oldData?.data,
            data: [...currentList, newMsg],
          },
        };
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Auto mark read if from partner
      if (newMsg.senderId !== user?.id) {
        messagingApi.markAsRead(activeConversationId);
      }
    });

    // 2. Live Typing Indicator Stream
    const unsubTyping = wsService.subscribe(`/topic/conversations/${activeConversationId}/typing`, (event: any) => {
      if (event.userId !== user?.id) {
        if (event.typing) {
          setPartnerTyping(event.userName || 'Someone');
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setPartnerTyping(null);
          }, 3000);
        } else {
          setPartnerTyping(null);
        }
      }
    });

    // 3. Live Custom Offers Stream
    const unsubOffers = wsService.subscribe(`/topic/conversations/${activeConversationId}/offers`, () => {
      queryClient.invalidateQueries({ queryKey: ['custom-offers', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      unsubMessages();
      unsubTyping();
      unsubOffers();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeConversationId, user?.id, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, partnerTyping]);

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (body: string) =>
      messagingApi.sendMessage({ conversationId: activeConversationId!, body }),
    onSuccess: () => {
      setMessageInput('');
      refetchMessages();
      refetchConversations();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send message';
      toast.error(msg);
    },
  });

  const lastTypingSentRef = useRef<number>(0);
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    const now = Date.now();
    if (activeConversationId && user && now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      wsService.send('/app/chat.typing', {
        conversationId: activeConversationId,
        userId: user.id,
        userName: user.name,
        typing: true,
      });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversationId) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  // 5. Create Custom Offer Mutation
  const createOfferMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; priceAmount: number; deliveryDays: number }) =>
      messagingApi.createCustomOffer(activeConversationId!, data),
    onSuccess: () => {
      toast.success('Custom offer proposed in conversation!');
      setIsOfferModalOpen(false);
      setOfferTitle('');
      setOfferDescription('');
      setOfferPrice(100);
      setOfferDays(3);
      refetchOffers();
      refetchMessages();
      refetchConversations();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create custom offer';
      toast.error(msg);
    },
  });

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      toast.error('Offer title is required');
      return;
    }
    if (!offerPrice || Number(offerPrice) < 5) {
      toast.error('Minimum offer price is $5');
      return;
    }
    createOfferMutation.mutate({
      title: offerTitle.trim(),
      description: offerDescription.trim() || undefined,
      priceAmount: Number(offerPrice),
      deliveryDays: Number(offerDays) || 3,
    });
  };

  // 6. Accept Custom Offer Mutation
  const acceptOfferMutation = useMutation({
    mutationFn: (offerId: number) => messagingApi.acceptCustomOffer(offerId),
    onSuccess: () => {
      toast.success('Offer accepted! Order created successfully.');
      refetchOffers();
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to accept offer';
      toast.error(msg);
    },
  });

  // 7. Decline Custom Offer Mutation
  const declineOfferMutation = useMutation({
    mutationFn: (offerId: number) => messagingApi.declineCustomOffer(offerId),
    onSuccess: () => {
      toast.success('Offer declined.');
      refetchOffers();
      refetchMessages();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to decline offer';
      toast.error(msg);
    },
  });

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.otherUserName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.listingTitle && c.listingTitle.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchFilter.toLowerCase()));

    if (activeFilterTab === 'unread') {
      return matchesSearch && (c.unreadCount || 0) > 0;
    }
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[580px]">
        {/* ──── LEFT PANE: CONVERSATION LIST ──── */}
        <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-gray-50/50 dark:bg-slate-900/50 flex-shrink-0">
          {/* Header & Search */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="text-primary-600 dark:text-primary-400" size={22} />
                Messages
              </h1>
              <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/50 dark:border-slate-700 px-2.5 py-1 rounded-full font-bold">
                {conversations.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="input text-xs pl-9 py-2 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 dark:text-white w-full"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeFilterTab === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                All Messages
              </button>
              <button
                onClick={() => setActiveFilterTab('unread')}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  activeFilterTab === 'unread'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Unread</span>
                {conversations.some((c) => (c.unreadCount || 0) > 0) && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {isConversationsLoading ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-primary-500" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500 space-y-2">
                <MessageSquare size={32} className="mx-auto text-gray-300 dark:text-slate-600" />
                <p className="font-medium text-gray-600 dark:text-slate-300">No conversations found</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  When clients or freelancers contact you, messages will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const hasUnread = (conv.unreadCount || 0) > 0;

                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative group ${
                      isActive
                        ? 'bg-white dark:bg-slate-800/90 border-l-4 border-l-primary-600 shadow-xs'
                        : 'hover:bg-white/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* User Avatar with status */}
                    <div className="relative flex-shrink-0">
                      {conv.otherUserAvatar ? (
                        <img
                          src={conv.otherUserAvatar}
                          alt={conv.otherUserName}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {getInitials(conv.otherUserName)}
                        </div>
                      )}
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 absolute bottom-0 right-0" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-slate-200'}`}>
                          {conv.otherUserName}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                          {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : ''}
                        </span>
                      </div>

                      {/* Service / Role Tag */}
                      {conv.listingTitle && (
                        <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium truncate mb-1 flex items-center gap-1">
                          <FileText size={11} className="flex-shrink-0" />
                          <span className="truncate">{conv.listingTitle}</span>
                        </p>
                      )}

                      {/* Last Message Snippet */}
                      <p
                        className={`text-xs truncate ${
                          hasUnread ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        {conv.lastMessage || 'Conversation started'}
                      </p>
                    </div>

                    {/* Unread Pill */}
                    {hasUnread && (
                      <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ──── RIGHT PANE: ACTIVE CHAT THREAD ──── */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {activeConversation.otherUserAvatar ? (
                    <img
                      src={activeConversation.otherUserAvatar}
                      alt={activeConversation.otherUserName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm">
                      {getInitials(activeConversation.otherUserName)}
                    </div>
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 absolute bottom-0 right-0" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      {activeConversation.otherUserName}
                    </h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/50 dark:border-slate-700">
                      {activeConversation.otherUserRole}
                    </span>
                  </div>

                  {activeConversation.listingTitle ? (
                    <Link
                      to={`/listings/${activeConversation.listingSlug}`}
                      target="_blank"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium mt-0.5"
                    >
                      <span>Gig: {activeConversation.listingTitle}</span>
                      {activeConversation.listingPrice && (
                        <span className="font-bold">({formatPrice(activeConversation.listingPrice)})</span>
                      )}
                      <ExternalLink size={11} />
                    </Link>
                  ) : (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online now
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                {/* Custom Offer Trigger */}
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Create Custom Offer</span>
                </button>
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/30 dark:bg-slate-950/40">
              {/* Linked Service Card Notice */}
              {activeConversation.listingTitle && (
                <div className="max-w-md mx-auto p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
                  {activeConversation.listingImageUrl ? (
                    <img
                      src={activeConversation.listingImageUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold flex-shrink-0">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {activeConversation.listingTitle}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-bold">
                      {activeConversation.listingPrice ? formatPrice(activeConversation.listingPrice) : ''}
                    </p>
                  </div>
                  <Link
                    to={`/listings/${activeConversation.listingSlug}`}
                    className="btn-secondary btn-sm text-[11px] py-1 px-2.5 flex-shrink-0"
                  >
                    View Gig
                  </Link>
                </div>
              )}

              {/* Render Custom Offer Cards in conversation */}
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="max-w-lg mx-auto bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-3xl p-5 shadow-xl border border-blue-800 space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                        Custom Project Offer
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        offer.status === 'accepted'
                          ? 'bg-emerald-500 text-white'
                          : offer.status === 'declined'
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-400 text-gray-900'
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{offer.title}</h3>
                    {offer.description && (
                      <p className="text-xs text-blue-100/90 leading-relaxed whitespace-pre-line">
                        {offer.description}
                      </p>
                    )}
                  </div>

                  {/* Price & Delivery Highlights */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-blue-200 font-medium">Total Price</p>
                        <p className="text-sm font-black text-white">{formatPrice(offer.priceAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-amber-400" />
                      <div>
                        <p className="text-[10px] text-blue-200 font-medium">Delivery Time</p>
                        <p className="text-sm font-black text-white">{offer.deliveryDays} Days</p>
                      </div>
                    </div>
                  </div>

                  {/* Accept / Decline Actions for Buyer */}
                  {offer.status === 'pending' && offer.buyerId === user?.id && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => acceptOfferMutation.mutate(offer.id)}
                        disabled={acceptOfferMutation.isPending}
                        className="btn-primary flex-1 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 border-none shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={15} />
                        <span>{acceptOfferMutation.isPending ? 'Starting Order...' : 'Accept & Start Project'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => declineOfferMutation.mutate(offer.id)}
                        disabled={declineOfferMutation.isPending}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {offer.status === 'accepted' && offer.orderId && (
                    <div className="text-center pt-1">
                      <Link
                        to="/orders"
                        className="text-xs font-bold text-emerald-300 hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Active Order in Orders Tab</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}
                </div>
              ))}

              {/* Message Bubbles */}
              {isMessagesLoading ? (
                <div className="text-center py-8 text-xs text-gray-400 dark:text-slate-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-slate-500 space-y-2">
                  <MessageSquare size={32} className="mx-auto text-gray-300 dark:text-slate-600" />
                  <p className="font-semibold text-gray-600 dark:text-slate-300">Start the conversation</p>
                  <p className="text-gray-400 dark:text-slate-500">Ask questions, discuss details, or negotiate project terms.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {!msg.isMine && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        {msg.senderAvatar ? (
                          <img src={msg.senderAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                            {getInitials(msg.senderName)}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] sm:max-w-md rounded-2xl px-4 py-3 shadow-xs space-y-1 ${
                        msg.isMine
                          ? 'bg-primary-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal break-words">
                        {msg.body}
                      </p>
                      <div
                        className={`text-[10px] text-right font-medium ${
                          msg.isMine ? 'text-primary-100' : 'text-gray-400 dark:text-slate-400'
                        }`}
                      >
                        {formatDate(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {/* Live Typing Indicator Bubble */}
              {partnerTyping && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300 text-xs w-fit animate-pulse mb-2 border border-gray-200/60 dark:border-slate-700 shadow-xs">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="font-medium text-gray-700 dark:text-slate-200">{partnerTyping} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-end gap-2">
              <textarea
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="input text-sm py-2.5 px-4 resize-none flex-1 max-h-32 min-h-[42px] focus:ring-primary-500 rounded-2xl"
              />

              <button
                type="submit"
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                className="btn-primary p-2.5 rounded-2xl flex-shrink-0 shadow-md active:scale-95 disabled:opacity-40 transition-transform"
                title="Send message"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        ) : (
          /* Empty Right Pane when no conversation is selected */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 dark:bg-slate-900/60">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare size={32} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Messages & Custom Offers</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mt-1">
              Select a conversation from the sidebar to chat, negotiate project details, or review custom offers.
            </p>
          </div>
        )}
      </div>

      {/* ──── CREATE CUSTOM OFFER MODAL ──── */}
      {isOfferModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOfferModalOpen(false)}>
          <div className="modal-content max-w-lg w-full relative" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-primary-600 dark:text-primary-400" />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Create Custom Project Offer</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Propose a personalized scope, milestone budget, and timeline to this client.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="modal-body py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Offer Title</label>
                <input
                  type="text"
                  required
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="e.g. Custom React Dashboard & Authentication Suite"
                  className="input text-sm py-2.5 w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Scope & Description</label>
                <textarea
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  placeholder="Detail the deliverables, technical specs, revisions, and what's included..."
                  rows={4}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Price Amount ($ USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      required
                      min={5}
                      step={5}
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="150"
                      className="input text-sm pl-7 py-2.5 w-full font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Delivery Timeline (Days)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={90}
                      value={offerDays}
                      onChange={(e) => setOfferDays(Number(e.target.value))}
                      placeholder="3"
                      className="input text-sm py-2.5 w-full font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-semibold">
                      days
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Escrow Protection Active
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  When the client accepts this offer, an active order is automatically created and protected by MarketForge escrow.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-md"
                >
                  {createOfferMutation.isPending ? 'Sending Offer...' : 'Send Custom Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

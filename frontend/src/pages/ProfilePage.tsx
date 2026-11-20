import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authApi, listingsApi, uploadApi, portfolioApi, assessmentsApi } from '@/api';
import { useAuthStore } from '@/store';
import { formatDate, formatPrice, getInitials, getMediaUrl } from '@/utils';
import {
  User as UserIcon,
  Mail,
  Phone,
  Clock,
  Palette,
  Lock,
  Edit3,
  ExternalLink,
  Layers,
  Save,
  Check,
  AlertCircle,
  Camera,
  UploadCloud,
  Sparkles,
  Link2,
  Trash2,
  X,
  RefreshCw,
  Crop,
  Eye,
  Share2,
  ShieldCheck,
  Zap,
  Award,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Trophy,
  Plus,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Listing, PortfolioItem, UserSkillBadge } from '@/types';
import AvatarCropper from '@/components/AvatarCropper';
import ProfilePictureViewerModal from '@/components/modals/ProfilePictureViewerModal';

const COVER_PRESETS = [
  { id: 'c1', label: 'Cosmic Violet', class: 'from-violet-700 via-indigo-700 to-blue-800' },
  { id: 'c2', label: 'Deep Ocean', class: 'from-blue-700 via-cyan-700 to-teal-800' },
  { id: 'c3', label: 'Midnight Slate', class: 'from-slate-900 via-slate-800 to-indigo-950' },
  { id: 'c4', label: 'Sunset Glow', class: 'from-rose-600 via-purple-700 to-indigo-800' },
  { id: 'c5', label: 'Emerald Forest', class: 'from-emerald-600 via-teal-700 to-cyan-800' },
];

const AVATAR_PRESETS = [
  { id: 'p1', label: 'Tech Lead', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  { id: 'p2', label: 'Designer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80' },
  { id: 'p3', label: 'Developer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { id: 'p4', label: 'Product Lead', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' },
  { id: 'p5', label: 'Engineer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
  { id: 'p6', label: 'Creator', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80' },
  { id: 'p7', label: 'Creative', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80' },
  { id: 'p8', label: 'Architect', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80' },
  { id: 'p9', label: 'Abstract 3D', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80' },
  { id: 'p10', label: 'Geometric', url: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=80' },
  { id: 'p11', label: 'Minimal', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80' },
  { id: 'p12', label: 'Modern Art', url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&auto=format&fit=crop&q=80' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'portfolio' | 'badges' | 'security'>('overview');

  // Fetch latest authenticated user details
  const { data: meData, refetch: refetchMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
  });
  const profileUser = meData?.data?.data || user;

  // Fetch seller listings if seller
  const isSeller = profileUser?.isSeller || !!profileUser?.sellerProfile;
  const { data: listingsData } = useQuery({
    queryKey: ['my-profile-listings'],
    queryFn: () => listingsApi.getMine(),
    enabled: isSeller,
  });
  const myListings: Listing[] = listingsData?.data?.data?.content || [];

  // Fetch my portfolio items
  const { data: portfolioData } = useQuery({
    queryKey: ['my-portfolio'],
    queryFn: () => portfolioApi.getMy(),
  });
  const myPortfolio: PortfolioItem[] = portfolioData?.data?.data || [];

  // Fetch my skill badges
  const { data: badgesData } = useQuery({
    queryKey: ['my-skill-badges'],
    queryFn: () => assessmentsApi.getMyBadges(),
  });
  const myBadges: UserSkillBadge[] = badgesData?.data?.data || [];

  // Portfolio form modal state
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioProjectUrl, setPortfolioProjectUrl] = useState('');
  const [portfolioThumbUrl, setPortfolioThumbUrl] = useState('');
  const [portfolioSkills, setPortfolioSkills] = useState('');
  const [portfolioDate, setPortfolioDate] = useState('');

  // Edit profile form state
  const [name, setName] = useState(profileUser?.name || '');
  const [displayName, setDisplayName] = useState(profileUser?.sellerProfile?.displayName || '');
  const [phone, setPhone] = useState(profileUser?.phone || '');
  const [bio, setBio] = useState(profileUser?.sellerProfile?.bio || '');
  const [hourlyRate, setHourlyRate] = useState<number | ''>(profileUser?.sellerProfile?.hourlyRate || '');
  const currentAvatar = profileUser?.avatarUrl || profileUser?.sellerProfile?.avatarUrl || '';
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [editAvatarLoadError, setEditAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [currentAvatar]);

  useEffect(() => {
    setEditAvatarLoadError(false);
  }, [avatarUrl]);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarModalTab, setAvatarModalTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [coverPreset, setCoverPreset] = useState(() => localStorage.getItem('mf_cover_preset') || 'c1');
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCoverClass = COVER_PRESETS.find((p) => p.id === coverPreset)?.class || COVER_PRESETS[0].class;

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard!');
  };

  const calculateProfileStrength = () => {
    let score = 30;
    if (profileUser?.emailVerifiedAt || profileUser?.authProvider === 'GOOGLE') score += 25;
    if (profileUser?.avatarUrl || profileUser?.sellerProfile?.avatarUrl) score += 20;
    if (profileUser?.sellerProfile?.bio || bio) score += 15;
    if (profileUser?.phone || phone) score += 10;
    return Math.min(100, score);
  };
  const profileStrength = calculateProfileStrength();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profileUser) {
      setName(profileUser.name || '');
      setPhone(profileUser.phone || '');
      const userPic = profileUser.avatarUrl || profileUser.sellerProfile?.avatarUrl || '';
      setAvatarUrl(userPic);
      if (profileUser.sellerProfile) {
        setDisplayName(profileUser.sellerProfile.displayName || '');
        setBio(profileUser.sellerProfile.bio || '');
        setHourlyRate(profileUser.sellerProfile.hourlyRate || '');
      }
    }
  }, [profileUser]);

  // Avatar management methods
  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (PNG, JPG, WEBP, or GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setIsCropping(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      const croppedFile = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
      const res = await uploadApi.uploadAvatar(croppedFile);
      const updatedUser = res.data?.data?.user;
      const uploadedUrl = res.data?.data?.url;
      if (updatedUser) {
        updateUser(updatedUser);
      } else if (uploadedUrl) {
        updateUser({ avatarUrl: uploadedUrl });
      }
      setAvatarUrl(uploadedUrl);
      refetchMe();
      toast.success('Profile picture cropped and updated successfully!');
      setIsCropping(false);
      setCropImageSrc(null);
      setIsAvatarModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to upload cropped avatar';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyPreset = async (presetUrl: string) => {
    setIsUploading(true);
    try {
      const res = await authApi.updateAvatar(presetUrl);
      const updatedUser = res.data?.data;
      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ avatarUrl: presetUrl });
      }
      setAvatarUrl(presetUrl);
      refetchMe();
      toast.success('Profile avatar updated!');
      setIsAvatarModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update avatar';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      toast.error('Please enter an image URL');
      return;
    }
    setIsUploading(true);
    try {
      const res = await authApi.updateAvatar(trimmed);
      const updatedUser = res.data?.data;
      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ avatarUrl: trimmed });
      }
      setAvatarUrl(trimmed);
      refetchMe();
      toast.success('Profile avatar updated!');
      setIsAvatarModalOpen(false);
      setCustomUrlInput('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update avatar';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setIsUploading(true);
    try {
      const res = await authApi.updateAvatar(null);
      const updatedUser = res.data?.data;
      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ avatarUrl: undefined });
      }
      setAvatarUrl('');
      refetchMe();
      toast.success('Avatar removed');
      setIsAvatarModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to remove avatar';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authApi.updateProfile(data),
    onSuccess: (res) => {
      const updated = res.data.data;
      updateUser(updated);
      refetchMe();
      toast.success('Profile updated successfully!');
      setActiveTab('overview');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }) =>
      authApi.updatePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('overview');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    },
  });

  // Portfolio Mutations & Handlers
  const savePortfolioMutation = useMutation({
    mutationFn: (data: { id?: number; body: Record<string, unknown> }) => {
      if (data.id) {
        return portfolioApi.update(data.id, data.body);
      }
      return portfolioApi.create(data.body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      toast.success(editingPortfolioId ? 'Portfolio project updated!' : 'Portfolio project added!');
      setIsPortfolioModalOpen(false);
      resetPortfolioForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save portfolio project';
      toast.error(msg);
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: (id: number) => portfolioApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      toast.success('Portfolio project removed');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete portfolio project';
      toast.error(msg);
    },
  });

  const resetPortfolioForm = () => {
    setEditingPortfolioId(null);
    setPortfolioTitle('');
    setPortfolioDesc('');
    setPortfolioProjectUrl('');
    setPortfolioThumbUrl('');
    setPortfolioSkills('');
    setPortfolioDate('');
  };

  const handleOpenAddPortfolio = () => {
    resetPortfolioForm();
    setIsPortfolioModalOpen(true);
  };

  const handleOpenEditPortfolio = (item: PortfolioItem) => {
    setEditingPortfolioId(item.id);
    setPortfolioTitle(item.title);
    setPortfolioDesc(item.description || '');
    setPortfolioProjectUrl(item.projectUrl || '');
    setPortfolioThumbUrl(item.thumbnailUrl || '');
    setPortfolioSkills(item.skills ? item.skills.join(', ') : '');
    setPortfolioDate(item.completionDate || '');
    setIsPortfolioModalOpen(true);
  };

  const handleSavePortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioTitle.trim()) {
      toast.error('Project title is required');
      return;
    }
    const skillsList = portfolioSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    savePortfolioMutation.mutate({
      id: editingPortfolioId || undefined,
      body: {
        title: portfolioTitle.trim(),
        description: portfolioDesc.trim(),
        projectUrl: portfolioProjectUrl.trim() || undefined,
        thumbnailUrl: portfolioThumbUrl.trim() || undefined,
        skills: skillsList,
        completionDate: portfolioDate.trim() || undefined,
      },
    });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      displayName: displayName.trim() || name.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || null,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      newPasswordConfirmation: confirmPassword,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* ──── HERO PROFILE CARD ──── */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-xl shadow-gray-200/50">
        {/* Dynamic Cover Banner */}
        <div className={`h-48 sm:h-56 bg-gradient-to-r ${activeCoverClass} relative overflow-hidden transition-all duration-500`}>
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/25" />
          
          {/* Top-Right Cover Customizer Pill */}
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={() => setIsCoverModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white text-xs font-medium backdrop-blur-md border border-white/20 transition-all shadow-sm active:scale-95"
            >
              <Palette size={13} />
              <span>Change Cover</span>
            </button>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-10 pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-20 sm:-mt-24 mb-6">
            {/* Avatar Section with Pulse Status */}
            <div className="relative group self-center sm:self-auto">
              <div
                onClick={() => setIsViewerOpen(true)}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full ring-4 ring-white shadow-2xl overflow-hidden bg-white flex items-center justify-center cursor-pointer relative"
                title="Click to view full photo"
              >
                {currentAvatar && !avatarLoadError ? (
                  <img
                    src={getMediaUrl(currentAvatar)}
                    alt={profileUser?.name}
                    onError={() => setAvatarLoadError(true)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center text-4xl font-extrabold tracking-tight">
                    {getInitials(profileUser?.name || 'U')}
                  </div>
                )}
                {/* Hover View Overlay */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[2px]">
                  <Eye size={26} className="drop-shadow" />
                  <span className="text-xs font-semibold drop-shadow">View Photo</span>
                </div>
              </div>

              {/* Live Active Online Status Dot */}
              <div
                className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white ring-2 ring-emerald-400/40 shadow-sm"
                title="Active now"
              />

              {/* Camera Edit Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPreset(null);
                  setIsCropping(false);
                  setCropImageSrc(null);
                  setIsAvatarModalOpen(true);
                }}
                className="absolute top-2 right-0 p-2.5 bg-gray-900/80 hover:bg-black text-white rounded-full ring-2 ring-white shadow-lg backdrop-blur-md transition-all hover:scale-110 flex items-center justify-center"
                title="Change or crop picture"
              >
                <Camera size={15} />
              </button>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 self-center sm:self-auto pt-2">
              <button
                type="button"
                onClick={handleShareProfile}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Share2 size={14} />
                <span>Share Profile</span>
              </button>

              {activeTab !== 'edit' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="btn-secondary py-2 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <UserIcon size={14} />
                  <span>View Overview</span>
                </button>
              )}

              {isSeller ? (
                <Link
                  to="/seller-studio"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Palette size={14} />
                  <span>Seller Studio</span>
                </Link>
              ) : (
                <Link
                  to="/seller-studio"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Start Selling</span>
                </Link>
              )}
            </div>
          </div>

          {/* User Name & Badges */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {profileUser?.sellerProfile?.displayName || profileUser?.name}
              </h1>

              {/* Verification & Role Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Verified Identity
                </span>

                {profileUser?.authProvider === 'GOOGLE' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.07.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                    </svg>
                    Google Connected
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                  {isSeller ? 'Top Freelancer' : 'Client & Buyer'}
                </span>

                {profileUser?.isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-gray-400" />
                <span className="font-medium text-gray-700">{profileUser?.email}</span>
              </span>
              {profileUser?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{profileUser.phone}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-gray-400" />
                <span>Joined {formatDate(profileUser?.createdAt || new Date().toISOString())}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <ShieldCheck size={14} />
                <span>Protected by MarketForge Escrow</span>
              </span>
            </div>
          </div>
        </div>

        {/* ──── TAB NAVIGATION PILLS ──── */}
        <div className="border-t border-gray-100 px-6 sm:px-10 py-3 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <UserIcon size={14} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'edit'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'portfolio'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Briefcase size={14} />
              <span>Portfolio ({myPortfolio.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('badges')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'badges'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Award size={14} />
              <span>Skill Badges ({myBadges.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Lock size={14} />
              <span>Security & Password</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 font-medium hidden sm:block">
            MarketForge Account ID: <span className="font-mono text-gray-600">#MF-{profileUser?.id || '001'}</span>
          </div>
        </div>
      </div>

      {/* ──── KEY METRIC HIGHLIGHT CARDS (Row of 4) ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
            <UserIcon size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Account Role</p>
            <p className="text-sm font-bold text-gray-900">{isSeller ? 'Top Freelancer' : 'Verified Buyer'}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-xs">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Orders Completed</p>
            <p className="text-sm font-bold text-gray-900">{profileUser?.sellerProfile?.completedOrdersCount || 0} Orders</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0 shadow-xs">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Payment Safety</p>
            <p className="text-sm font-bold text-gray-900">100% Escrow</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 shadow-xs">
            <Zap size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Profile Strength</p>
              <span className="text-xs font-bold text-amber-700">{profileStrength}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${profileStrength}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ──── TAB 1: OVERVIEW CONTENT ──── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-Column Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Professional Bio Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <UserIcon size={18} className="text-primary-600" />
                  About Me & Background
                </h2>
                <button
                  onClick={() => setActiveTab('edit')}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                >
                  <Edit3 size={13} />
                  <span>Edit Bio</span>
                </button>
              </div>

              {profileUser?.sellerProfile?.bio ? (
                <div className="relative pl-4 border-l-2 border-primary-500/40">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-normal">
                    {profileUser.sellerProfile.bio}
                  </p>
                </div>
              ) : (
                <div className="py-6 px-4 bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Edit3 size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800">No biography added yet</p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Share your skills, work experience, and what you're looking to build on MarketForge.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="btn-primary btn-sm inline-flex items-center gap-1.5"
                  >
                    <span>Add Biography</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Skills & Expertise Showcase */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  Skills & Endorsements
                </h2>
                <button
                  onClick={() => setActiveTab('edit')}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Manage Skills
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {['Full-Stack Development', 'React & TypeScript', 'Spring Boot', 'UI/UX Design', 'API Architecture', 'Marketplace Specialist'].map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-gray-700 border border-gray-200/80 transition-colors cursor-pointer"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Featured Portfolio Case Studies Preview */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase size={18} className="text-primary-600" />
                  Portfolio & Case Studies ({myPortfolio.length})
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenAddPortfolio}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    onClick={() => setActiveTab('portfolio')}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                  >
                    View All
                  </button>
                </div>
              </div>

              {myPortfolio.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                  <p>No portfolio case studies published yet.</p>
                  <button
                    onClick={handleOpenAddPortfolio}
                    className="mt-2 text-primary-600 font-bold hover:underline"
                  >
                    + Add your first case study
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myPortfolio.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50/40 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="h-32 bg-gray-100 overflow-hidden">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 bg-gray-100">
                            {item.title[0]}
                          </div>
                        )}
                      </div>
                      <div className="p-3.5 space-y-1">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{item.title}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verified Skill Badges Preview */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  Verified Skill Badges ({myBadges.length})
                </h2>
                <Link
                  to="/assessments"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Zap size={13} /> Take Assessment
                </Link>
              </div>

              {myBadges.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                  <p>Prove your technical skills with our 15-minute proctored tests.</p>
                  <Link to="/assessments" className="mt-2 inline-block text-primary-600 font-bold hover:underline">
                    Take an assessment & get verified
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myBadges.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-gradient-to-r from-amber-50/70 to-emerald-50/50 border border-amber-200/80 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        <Award size={18} />
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{b.skillName}</h4>
                        <p className="text-[10px] text-gray-500">{b.badgeLevel} • {b.score}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* If Buyer: High-Converting Seller Invitation Card */}
            {!isSeller ? (
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 p-7 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-200">
                    <Sparkles size={13} />
                    <span>Become a Freelancer</span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold tracking-tight">Ready to earn on MarketForge?</h3>
                    <p className="text-xs text-blue-100/80 max-w-lg leading-relaxed">
                      Publish your services, set your own hourly rates, and connect with enterprise clients worldwide with guaranteed escrow payouts.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-blue-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      <span>0% Intro Fees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      <span>Instant Escrow Payouts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      <span>Global Buyer Reach</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/seller-studio"
                      className="px-5 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-lg transition-transform active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <span>Activate Seller Studio</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* If Seller: Published Services */
              <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Layers size={18} className="text-primary-600" />
                    Published Services ({myListings.length})
                  </h2>
                  <Link
                    to="/seller-studio"
                    className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                  >
                    Manage in Studio <ExternalLink size={12} />
                  </Link>
                </div>

                {myListings.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">
                    You have not published any service listings yet.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {myListings.map((listing) => (
                      <Link
                        key={listing.id}
                        to={`/listings/${listing.slug}`}
                        className="py-3 flex items-center justify-between hover:bg-gray-50/50 p-2 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-primary-600 border overflow-hidden">
                            {listing.imageUrls && listing.imageUrls.length > 0 ? (
                              <img src={listing.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              listing.title[0]
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 line-clamp-1">
                              {listing.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {listing.deliveryDays}d delivery • {listing.completedOrdersCount || 0} orders
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(listing.priceAmount)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar Section */}
          <div className="space-y-6">
            {/* Profile Completion Checklist */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Profile Checklist</h3>
                <span className="text-xs font-bold text-primary-600">{profileStrength}% Complete</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-emerald-900">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Account Registered
                  </span>
                  <span className="font-bold text-emerald-700">Done</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-emerald-900">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Google Account Linked
                  </span>
                  <span className="font-bold text-emerald-700">Done</span>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  currentAvatar ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={15} className={currentAvatar ? 'text-emerald-600' : 'text-gray-400'} />
                    Profile Picture Added
                  </span>
                  <span className="font-bold text-gray-600">{currentAvatar ? 'Done' : '+20%'}</span>
                </div>

                <div
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer hover:border-primary-300 transition-colors ${
                    profileUser?.sellerProfile?.bio ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={15} className={profileUser?.sellerProfile?.bio ? 'text-emerald-600' : 'text-gray-400'} />
                    Add Professional Bio
                  </span>
                  <span className="font-bold text-primary-600">{profileUser?.sellerProfile?.bio ? 'Done' : 'Add'}</span>
                </div>
              </div>
            </div>

            {/* Trust & Verification Badges */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-gray-400 text-[11px]">
                Trust & Security Badges
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Identity Status
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Verified</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <Mail size={16} className="text-primary-600" />
                    Email Confirmation
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <Lock size={16} className="text-indigo-600" />
                    Escrow Protection
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">100% Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──── COVER CUSTOMIZER MODAL ──── */}
      {isCoverModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCoverModalOpen(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Palette size={18} className="text-primary-600" />
                Choose Cover Theme
              </h3>
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-3 py-4">
              <p className="text-xs text-gray-500">
                Select a modern banner gradient for your profile page:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCoverPreset(preset.id);
                      localStorage.setItem('mf_cover_preset', preset.id);
                      setIsCoverModalOpen(false);
                      toast.success(`Cover theme updated to ${preset.label}!`);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      coverPreset === preset.id
                        ? 'border-primary-600 ring-2 ring-primary-100 bg-primary-50/30'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-8 rounded-lg bg-gradient-to-r ${preset.class} shadow-xs border border-white/20`} />
                      <span className="text-sm font-semibold text-gray-800">{preset.label}</span>
                    </div>
                    {coverPreset === preset.id && (
                      <CheckCircle2 size={18} className="text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {activeTab === 'edit' && (
        <div className="card p-6 sm:p-8 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Profile Information</h2>
            <p className="text-xs text-gray-500 mt-1">
              Update your public freelancer persona, contact details, and hourly compensation.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Full Legal Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </div>

              <div>
                <label className="label">Public Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. Alex Morgan (Fullstack Pro)"
                />
                <p className="text-[11px] text-gray-400 mt-1">Shown to clients on your services and reviews.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input text-sm"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="label">Hourly Rate ($ USD / hour)</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value ? Number(e.target.value) : '')}
                  className="input text-sm"
                  placeholder="e.g. 75"
                />
              </div>
            </div>

            {/* Enhanced Profile Picture Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl ring-2 ring-primary-100 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    {avatarUrl && !editAvatarLoadError ? (
                      <img
                        src={getMediaUrl(avatarUrl)}
                        alt="Avatar"
                        onError={() => setEditAvatarLoadError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center text-xl font-bold">
                        {getInitials(name || 'U')}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Profile Picture</h3>
                    <p className="text-xs text-gray-500">
                      Upload a photo or choose from our curated presets. Visible to clients across MarketForge.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setIsViewerOpen(true)}
                      className="btn-secondary btn-sm flex items-center gap-1.5"
                      title="View full-size photo"
                    >
                      <Eye size={14} /> View
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarModalTab('upload');
                      setIsCropping(false);
                      setCropImageSrc(null);
                      setIsAvatarModalOpen(true);
                    }}
                    className="btn-primary btn-sm flex items-center gap-1.5"
                  >
                    <UploadCloud size={14} /> Upload New
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCropImageSrc(getMediaUrl(avatarUrl));
                        setIsCropping(true);
                        setIsAvatarModalOpen(true);
                      }}
                      className="btn-secondary btn-sm flex items-center gap-1.5"
                      title="Adjust crop, rotation, or zoom of current picture"
                    >
                      <Crop size={14} /> Crop / Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarModalTab('preset');
                      setIsCropping(false);
                      setIsAvatarModalOpen(true);
                    }}
                    className="btn-secondary btn-sm flex items-center gap-1.5"
                  >
                    <Sparkles size={14} /> Presets
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                      title="Clear picture"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200/70">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Or use a custom image link (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="input text-xs flex-1 bg-white"
                    placeholder="https://images.unsplash.com/... or hosted profile picture"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="btn-secondary btn-sm text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Professional Bio / About Me</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="input text-sm"
                placeholder="Highlight your technical background, industry experience, key tools, and communication style..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Save size={15} />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="card p-6 sm:p-8 space-y-6 max-w-2xl">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lock size={20} className="text-primary-600" /> Account Security & Password
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Keep your marketplace account secure with an updated password.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="label">New Password (min 8 characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-xs text-amber-800">
              <AlertCircle size={18} className="flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Security Best Practices</p>
                <p className="mt-0.5 text-amber-700">
                  Use at least 8 characters with a mix of letters, numbers, and symbols. Never share your password with anyone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Lock size={15} />
                {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ──── TAB 4: PORTFOLIO & CASE STUDIES ──── */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="text-primary-600 w-5 h-5" />
                My Portfolio & Case Studies ({myPortfolio.length})
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Showcase past client projects, architectural diagrams, and code demonstrations on your public profile.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddPortfolio}
              className="btn-primary flex items-center gap-2 self-start sm:self-auto py-2.5 px-5 shadow-sm text-xs font-bold"
            >
              <Plus size={16} /> Add Case Study
            </button>
          </div>

          {myPortfolio.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
                <Briefcase size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">No portfolio projects added yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Freelancers with at least 2 portfolio case studies receive 4x more direct client inquiries.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddPortfolio}
                className="btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPortfolio.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 bg-gray-100 overflow-hidden relative">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary-300 bg-primary-50">
                          {item.title[0]}
                        </div>
                      )}
                      {item.completionDate && (
                        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar size={11} /> {item.completionDate}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{item.description}</p>

                      {item.skills && item.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50/75 border-t border-gray-100 flex items-center justify-between">
                    {item.projectUrl ? (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <ExternalLink size={13} /> View Demo
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Internal Case Study</span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPortfolio(item)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors border border-gray-200"
                        title="Edit project"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this portfolio project?')) {
                            deletePortfolioMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-gray-200"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── TAB 5: VERIFIED SKILL BADGES ──── */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="text-amber-500 w-5 h-5" />
                Verified Skill Badges ({myBadges.length})
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Certificates and badges earned by completing MarketForge standardized technical assessments.
              </p>
            </div>

            <Link
              to="/assessments"
              className="btn-primary flex items-center gap-2 self-start sm:self-auto py-2.5 px-5 shadow-sm text-xs font-bold"
            >
              <Zap size={16} /> Take Skill Assessment
            </Link>
          </div>

          {myBadges.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Award size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">No skill badges earned yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Pass our 15-minute quick assessments in React, Spring Boot, or UI/UX Design to earn top-tier verified badges for your profile.
                </p>
              </div>
              <Link to="/assessments" className="btn-primary btn-sm inline-flex items-center gap-1.5">
                <Zap size={14} /> Browse Available Tests
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBadges.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl border border-amber-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                      <Award size={28} />
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <h4 className="font-bold text-gray-900 text-base truncate">{b.skillName}</h4>
                      <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        {b.badgeLevel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Score: <strong className="text-emerald-600 font-bold">{b.score}%</strong>
                    </span>
                    <span>Earned {formatDate(b.earnedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── MODAL: Add / Edit Portfolio Project ──── */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-8 overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {editingPortfolioId ? 'Edit Case Study' : 'Add Portfolio Case Study'}
                  </h3>
                  <p className="text-xs text-gray-500">Share your achievements with potential clients</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePortfolioSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next-Gen Mobile Banking Application"
                  value={portfolioTitle}
                  onChange={(e) => setPortfolioTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Thumbnail / Screenshot URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={portfolioThumbUrl}
                  onChange={(e) => setPortfolioThumbUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Live Demo / Demonstration URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/demo"
                  value={portfolioProjectUrl}
                  onChange={(e) => setPortfolioProjectUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Skills Used (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="React, TypeScript, AWS"
                    value={portfolioSkills}
                    onChange={(e) => setPortfolioSkills(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Completion Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. November 2026"
                    value={portfolioDate}
                    onChange={(e) => setPortfolioDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Case Study: Client Challenge & Delivered Solution
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the architectural challenges, client business goals, and measurable outcomes..."
                  value={portfolioDesc}
                  onChange={(e) => setPortfolioDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savePortfolioMutation.isPending}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Save size={14} />
                  {savePortfolioMutation.isPending ? 'Saving...' : 'Publish Case Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Avatar Change Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {isCropping ? (
                    <>
                      <Crop size={18} className="text-primary-600" />
                      Crop & Edit Profile Picture
                    </>
                  ) : (
                    <>
                      <Camera size={18} className="text-primary-600" />
                      Change Profile Picture
                    </>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isCropping
                    ? 'Drag to pan, use slider to zoom, and rotate to fit your frame'
                    : 'Choose how you would like to set your avatar'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isUploading) {
                    setIsAvatarModalOpen(false);
                    setIsCropping(false);
                    setCropImageSrc(null);
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* If in Cropping Mode: Show Interactive Cropper directly */}
            {isCropping && cropImageSrc ? (
              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
                <AvatarCropper
                  imageSrc={cropImageSrc}
                  onCropComplete={handleCropComplete}
                  onCancel={() => {
                    setIsCropping(false);
                    setCropImageSrc(null);
                  }}
                  isSaving={isUploading}
                />
              </div>
            ) : (
              <>
                {/* Modal Navigation Tabs */}
                <div className="flex border-b border-gray-100 px-6 bg-white">
                  <button
                    type="button"
                    onClick={() => setAvatarModalTab('upload')}
                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                      avatarModalTab === 'upload'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <UploadCloud size={15} /> Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarModalTab('preset')}
                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors ml-6 ${
                      avatarModalTab === 'preset'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Sparkles size={15} /> Curated Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarModalTab('url')}
                    className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors ml-6 ${
                      avatarModalTab === 'url'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Link2 size={15} /> Web Link (URL)
                  </button>
                </div>

                {/* Modal Tab Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* TAB 1: UPLOAD */}
                  {avatarModalTab === 'upload' && (
                    <div className="space-y-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            processSelectedFile(e.target.files[0]);
                          }
                        }}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />

                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                          dragActive
                            ? 'border-primary-500 bg-primary-50/50 scale-[0.99]'
                            : 'border-gray-200 hover:border-primary-400 bg-gray-50/50 hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center shadow-sm">
                          <UploadCloud size={32} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-800">
                            Click to upload or drag & drop photo
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            JPG, PNG, WEBP, or GIF up to 5MB
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="btn-secondary btn-sm text-xs">
                            Select Photo
                          </span>
                          {currentAvatar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCropImageSrc(currentAvatar);
                                setIsCropping(true);
                              }}
                              className="btn-secondary btn-sm text-xs flex items-center gap-1"
                            >
                              <Crop size={13} /> Crop Current Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CURATED PRESETS */}
                  {avatarModalTab === 'preset' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">
                        Select an avatar preset:
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                        {AVATAR_PRESETS.map((preset) => {
                          const isSelected = selectedPreset === preset.url;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => setSelectedPreset(preset.url)}
                              className={`relative group rounded-2xl overflow-hidden cursor-pointer ring-2 transition-all p-1 ${
                                isSelected
                                  ? 'ring-primary-600 bg-primary-50/50 shadow-md scale-95'
                                  : 'ring-gray-200 hover:ring-primary-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                                <img
                                  src={preset.url}
                                  alt={preset.label}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center shadow">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}
                              <p className="text-[10px] text-gray-600 font-medium text-center mt-1 truncate">
                                {preset.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          disabled={!selectedPreset || isUploading}
                          onClick={() => {
                            if (selectedPreset) {
                              setCropImageSrc(selectedPreset);
                              setIsCropping(true);
                            }
                          }}
                          className="btn-secondary btn-sm flex items-center gap-1.5"
                        >
                          <Crop size={14} /> Crop & Adjust
                        </button>
                        <button
                          type="button"
                          disabled={!selectedPreset || isUploading}
                          onClick={() => selectedPreset && handleApplyPreset(selectedPreset)}
                          className="btn-primary btn-sm flex items-center gap-1.5"
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" /> Applying...
                            </>
                          ) : (
                            <>
                              <Check size={14} /> Apply Avatar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CUSTOM URL */}
                  {avatarModalTab === 'url' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Direct Image Web Address
                        </label>
                        <input
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="input text-sm"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          Make sure the link points directly to an image (.jpg, .png, etc.)
                        </p>
                      </div>

                      {customUrlInput.trim() && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                          <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-gray-200 bg-white flex-shrink-0">
                            <img
                              src={customUrlInput}
                              alt="URL Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute(
                                  'src',
                                  'https://placehold.co/100x100?text=Invalid+Image'
                                );
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">Preview</p>
                            <p className="text-[11px] text-gray-500">
                              Image loaded from the web URL provided.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          disabled={!customUrlInput.trim() || isUploading}
                          onClick={() => {
                            if (customUrlInput.trim()) {
                              setCropImageSrc(customUrlInput.trim());
                              setIsCropping(true);
                            }
                          }}
                          className="btn-secondary btn-sm flex items-center gap-1.5"
                        >
                          <Crop size={14} /> Crop & Adjust
                        </button>
                        <button
                          type="button"
                          disabled={!customUrlInput.trim() || isUploading}
                          onClick={handleApplyCustomUrl}
                          className="btn-primary btn-sm flex items-center gap-1.5"
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Check size={14} /> Apply Directly
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer with Remove Avatar option */}
                <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    {currentAvatar ? (
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={handleRemoveAvatar}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 p-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} /> Remove Current Picture
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Currently using monogram avatar</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setIsAvatarModalOpen(false);
                      setIsCropping(false);
                      setCropImageSrc(null);
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Profile Picture Fullscreen Viewer Modal */}
      <ProfilePictureViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={getMediaUrl(currentAvatar)}
        userName={profileUser?.sellerProfile?.displayName || profileUser?.name || 'User'}
        userRole={profileUser?.isAdmin ? 'Admin' : (isSeller ? 'Freelancer' : 'Buyer')}
        isOwnProfile={true}
        onEditAvatar={() => {
          setSelectedPreset(null);
          setIsCropping(false);
          setCropImageSrc(null);
          setIsAvatarModalOpen(true);
        }}
      />
    </div>
  );
}

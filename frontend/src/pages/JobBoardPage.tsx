import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { jobsApi, metadataApi } from '@/api';
import { useAuthStore, useUIStore } from '@/store';
import { formatPrice, formatDate } from '@/utils';
import type { JobPost, Category } from '@/types';
import {
  Search,
  Briefcase,
  DollarSign,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  PlusCircle,
  FileText
} from 'lucide-react';

export default function JobBoardPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [budgetType, setBudgetType] = useState<string>('ALL');
  const [experienceLevel, setExperienceLevel] = useState<string>('ALL');

  // Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => metadataApi.getCategories(),
  });
  const categories: Category[] = categoriesData?.data?.data || [];

  // Jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', keyword, selectedCategory, budgetType, experienceLevel],
    queryFn: () =>
      jobsApi.getAll({
        keyword: keyword.trim() || undefined,
        categoryId: selectedCategory,
        budgetType: budgetType !== 'ALL' ? budgetType : undefined,
        experienceLevel: experienceLevel !== 'ALL' ? experienceLevel : undefined,
      }),
  });

  const jobs: JobPost[] = jobsData?.data?.data?.content || [];

  const handlePostJobClick = () => {
    if (!isAuthenticated) {
      openModal('auth');
      return;
    }
    navigate('/jobs/new');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ──── HERO SECTION ──── */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/15">
            MarketForge Client Job Board
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
            Find High-Paying Freelance Projects & Custom Contracts
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Browse verified client job postings, submit tailored proposals, and secure guaranteed milestone payments held in MarketForge Escrow.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handlePostJobClick}
              className="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-all shadow-md cursor-pointer"
            >
              Post a Job as a Client
            </button>
            <Link
              to="/services"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/20"
            >
              Explore Gigs & Services
            </Link>
          </div>
        </div>
      </div>

      {/* ──── SEARCH & FILTERS BAR ──── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by role, required tech stack, or keyword (e.g. React, Spring Boot, Figma, Flutter)..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Budget Type */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
              {['ALL', 'FIXED_PRICE', 'HOURLY'].map((type) => (
                <button
                  key={type}
                  onClick={() => setBudgetType(type)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    budgetType === type
                      ? 'bg-white text-gray-900 shadow-xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {type === 'ALL' ? 'All Budgets' : type === 'FIXED_PRICE' ? 'Fixed Price' : 'Hourly'}
                </button>
              ))}
            </div>

            {/* Experience Level */}
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Experience Levels</option>
              <option value="ENTRY">Entry Level</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{jobs.length}</span> open jobs
          </div>
        </div>
      </div>

      {/* ──── JOBS LIST ──── */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-gray-200 rounded-3xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl mx-auto flex items-center justify-center">
            <Briefcase size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No jobs match your search criteria</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Try adjusting your search terms, changing category filters, or be the first client to post a job!
          </p>
          <button
            onClick={handlePostJobClick}
            className="btn-primary inline-flex items-center gap-2 mt-2"
          >
            <PlusCircle size={16} /> Post a Project Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.slug}`}
              className="block bg-white border border-gray-200 hover:border-primary-400 hover:shadow-md rounded-3xl p-6 transition-all group relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Posted {formatDate(job.createdAt)}
                    </span>
                    {job.category && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full">
                          {job.category.name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Budget pill */}
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl w-fit font-bold text-sm border border-emerald-100">
                    <DollarSign size={15} />
                    <span>
                      {job.budgetType === 'HOURLY'
                        ? `${formatPrice(job.budgetAmount)}/hr`
                        : formatPrice(job.budgetAmount)}
                    </span>
                    <span className="text-xs text-emerald-600 font-normal">
                      ({job.budgetType === 'HOURLY' ? 'Hourly' : 'Fixed Price'})
                    </span>
                  </div>
                </div>

                {/* Job Title */}
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {job.title}
                </h3>

                {/* Description snippet */}
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Skills tags */}
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-medium transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta details footer */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-gray-400" />
                      <span>{job.duration || '1 to 3 months'}</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-gray-400" />
                      <span className="capitalize">{job.experienceLevel?.toLowerCase()} Level</span>
                    </span>

                    <span className="flex items-center gap-1.5 text-primary-600 font-medium">
                      <FileText size={13} />
                      <span>{job.proposalsCount} Proposals</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-gray-700 font-medium">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span>Verified Client: {job.client?.name}</span>
                    </div>

                    <span className="text-primary-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                      View Job <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

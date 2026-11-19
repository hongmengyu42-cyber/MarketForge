import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, metadataApi } from '@/api';
import type { Category } from '@/types';
import {
  DollarSign,
  ArrowLeft,
  X,
  Plus,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PostJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [budgetType, setBudgetType] = useState<'FIXED_PRICE' | 'HOURLY'>('FIXED_PRICE');
  const [budgetAmount, setBudgetAmount] = useState<number | ''>(500);
  const [budgetMax, setBudgetMax] = useState<number | ''>('');
  const [experienceLevel, setExperienceLevel] = useState<'ENTRY' | 'INTERMEDIATE' | 'EXPERT'>('INTERMEDIATE');
  const [duration, setDuration] = useState('1 to 3 months');

  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript', 'Tailwind CSS']);
  const [skillInput, setSkillInput] = useState('');

  // Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => metadataApi.getCategories(),
  });
  const categories: Category[] = categoriesData?.data?.data || [];

  const postMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      categoryId?: number;
      budgetType: string;
      budgetAmount: number;
      budgetMax?: number;
      experienceLevel: string;
      duration: string;
      skills: string[];
    }) => jobsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Your job has been published to the MarketForge Job Board!');
      const slug = res.data?.data?.slug;
      if (slug) {
        navigate(`/jobs/${slug}`);
      } else {
        navigate('/jobs');
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to publish job';
      toast.error(msg);
    },
  });

  const handleAddSkill = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    if (!description.trim() || description.length < 20) {
      toast.error('Please write a detailed job description (minimum 20 characters)');
      return;
    }
    if (!budgetAmount || Number(budgetAmount) < 5) {
      toast.error('Please enter a valid budget of at least $5');
      return;
    }

    postMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      categoryId: categoryId ? Number(categoryId) : undefined,
      budgetType,
      budgetAmount: Number(budgetAmount),
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      experienceLevel,
      duration,
      skills,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/jobs"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">
              Client Portal
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500">Post a New Project</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">
            Create a Project & Receive Freelancer Proposals
          </h1>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Project Title *
          </label>
          <p className="text-xs text-gray-500">
            Write a clear, concise title describing the role or deliverable.
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior React & Spring Boot Developer for Marketplace Platform"
            className="input text-sm"
            required
            maxLength={150}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Primary Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            className="input text-sm"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-900">
            Project Scope & Specifications *
          </label>
          <p className="text-xs text-gray-500">
            Describe your project goals, required deliverables, existing codebase/designs, and expectations.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="Outline what needs to be built, preferred tech stack, key user stories, references, and deadline constraints..."
            className="input text-sm leading-relaxed"
            required
          />
        </div>

        {/* Skills Required */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-900">
            Required Skills & Technologies
          </label>
          <p className="text-xs text-gray-500">
            Add relevant skills so expert freelancers can find your post.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              placeholder="e.g. React, Spring Boot, MySQL, Figma (Press Enter)"
              className="input text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => handleAddSkill()}
              className="btn-secondary btn-sm px-4"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-50 text-primary-700 text-xs font-semibold border border-primary-100"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(idx)}
                  className="text-primary-400 hover:text-primary-700 font-bold"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Budget Section */}
        <div className="pt-6 border-t border-gray-100 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={18} className="text-primary-600" />
            <span>Budget & Payment Structure</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fixed vs Hourly */}
            <div
              onClick={() => setBudgetType('FIXED_PRICE')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                budgetType === 'FIXED_PRICE'
                  ? 'border-primary-600 bg-primary-50/30'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-sm text-gray-900">Fixed Price Project</div>
              <p className="text-xs text-gray-500 mt-1">
                Pay a single milestone-based total price for complete delivery.
              </p>
            </div>

            <div
              onClick={() => setBudgetType('HOURLY')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                budgetType === 'HOURLY'
                  ? 'border-primary-600 bg-primary-50/30'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-sm text-gray-900">Hourly Rate</div>
              <p className="text-xs text-gray-500 mt-1">
                Pay per hour of logged work with weekly hour limits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {budgetType === 'FIXED_PRICE' ? 'Total Project Budget ($) *' : 'Hourly Rate ($/hr) *'}
              </label>
              <input
                type="number"
                min={5}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="500"
                className="input text-sm font-bold"
                required
              />
            </div>

            {budgetType === 'HOURLY' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Maximum Hourly Rate ($/hr)
                </label>
                <input
                  type="number"
                  min={5}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="75"
                  className="input text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Experience & Timeline */}
        <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              Preferred Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as any)}
              className="input text-sm"
            >
              <option value="ENTRY">Entry Level (Cost-efficient, newer talent)</option>
              <option value="INTERMEDIATE">Intermediate (Solid experience, proven track record)</option>
              <option value="EXPERT">Expert (Deep domain mastery, senior architectural skill)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">
              Estimated Project Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input text-sm"
            >
              <option value="Less than 1 month">Less than 1 month</option>
              <option value="1 to 3 months">1 to 3 months</option>
              <option value="3 to 6 months">3 to 6 months</option>
              <option value="More than 6 months">More than 6 months</option>
            </select>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
          <Link to="/jobs" className="btn-secondary btn-sm">
            Cancel
          </Link>

          <button
            type="submit"
            disabled={postMutation.isPending}
            className="btn-primary py-3 px-8 text-sm font-bold flex items-center gap-2 shadow-md active:scale-95"
          >
            <Send size={16} />
            {postMutation.isPending ? 'Publishing Job...' : 'Publish Job to Board'}
          </button>
        </div>
      </form>
    </div>
  );
}

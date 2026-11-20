import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assessmentsApi } from '@/api';
import { useAuthStore, useUIStore } from '@/store';
import type {
  SkillAssessmentSummary,
  SkillAssessmentDetail,
  AssessmentResult,
  UserSkillBadge
} from '@/types';
import {
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Trophy,
  BookOpen,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssessmentsPage() {
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();
  const queryClient = useQueryClient();

  // Test session state
  const [activeTestId, setActiveTestId] = useState<number | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<AssessmentResult | null>(null);

  // Fetch assessments list
  const { data: assessmentsResp, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => assessmentsApi.getAll(),
  });
  const assessments: SkillAssessmentSummary[] = assessmentsResp?.data?.data || [];

  // Fetch my badges
  const { data: myBadgesResp } = useQuery({
    queryKey: ['my-badges'],
    queryFn: () => assessmentsApi.getMyBadges(),
    enabled: isAuthenticated,
  });
  const myBadges: UserSkillBadge[] = myBadgesResp?.data?.data || [];

  // Fetch active test details
  const { data: testDetailResp, isLoading: isTestLoading } = useQuery({
    queryKey: ['assessment-detail', activeTestId],
    queryFn: () => assessmentsApi.getById(activeTestId!),
    enabled: activeTestId != null,
  });
  const testDetail: SkillAssessmentDetail | undefined = testDetailResp?.data?.data;

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: ({ id, answers }: { id: number; answers: Record<number, number> }) =>
      assessmentsApi.submit(id, answers),
    onSuccess: (res) => {
      setIsSubmitting(false);
      setTestResult(res?.data?.data);
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['my-badges'] });
      if (res?.data?.data?.passed) {
        toast.success('Congratulations! You passed and earned a Verified Badge!');
      } else {
        toast.error('Assessment completed. You can retake to improve your score.');
      }
    },
    onError: (err: unknown) => {
      setIsSubmitting(false);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit test';
      toast.error(msg);
    },
  });

  // Start test handler
  const handleStartTest = (assessmentId: number) => {
    if (!isAuthenticated) {
      openModal('auth');
      return;
    }
    setActiveTestId(assessmentId);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setTestResult(null);
  };

  // Timer countdown
  useEffect(() => {
    if (!activeTestId || !testDetail || testResult) return;
    setTimeLeft(testDetail.timeLimitMinutes * 60);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTestId, testDetail, testResult]);

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmitTest = () => {
    if (!activeTestId) return;
    setIsSubmitting(true);
    submitMutation.mutate({
      id: activeTestId,
      answers: selectedAnswers,
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Hero Section */}
        <div className="relative rounded-3xl bg-slate-950 text-white p-8 sm:p-12 overflow-hidden shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              MarketForge Verified Skill Credentials
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Prove Your Skills. Win High-Paying Clients.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Take rigorous, 15-minute standardized assessments in top technologies. Score in the top tier (80%+) to earn certified badges displayed prominently across your proposals and public profile.
            </p>
          </div>
        </div>

        {/* My Earned Badges Showcase */}
        {myBadges.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Your Earned Skill Badges ({myBadges.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Verified credentials attached to your MarketForge profile and proposals.
                </p>
              </div>
              <Link to="/profile" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
                View on Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBadges.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-200/80 dark:border-amber-800/40 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-md flex-shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{b.skillName}</h4>
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                        {b.badgeLevel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Score: <strong className="text-emerald-700 dark:text-emerald-400">{b.score}%</strong> • Verified Pro
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessments Catalog */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                Available Skill Assessments
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Standardized multiple-choice examinations curated by senior industry experts.
              </p>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200/50 dark:border-slate-700">
              Passing Mark: 80% • Unlimited Retakes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isAssessmentsLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-gray-200 dark:bg-slate-800 animate-pulse" />
              ))
            ) : (
              assessments.map((a) => (
                <div
                  key={a.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/40">
                        {a.skillName}
                      </span>
                      {a.userPassed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Passed ({a.userScore}%)
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Ready to take</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {a.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">
                        {a.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" /> {a.timeLimitMinutes} mins
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> {a.questionsCount} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" /> Pass: {a.passingScore}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleStartTest(a.id)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        a.userPassed
                          ? 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                      }`}
                    >
                      {a.userPassed ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" /> Retake to Improve
                        </>
                      ) : (
                        <>
                          <span>Start Assessment</span> <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ──── MODAL: Interactive Quiz Testing Modal ──── */}
      {activeTestId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-sm">
                    {testDetail?.title || 'Skill Assessment'}
                  </h3>
                  <span className="text-[11px] text-gray-400">Standardized Certification Test</span>
                </div>
              </div>

              {!testResult && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-bold text-amber-300">
                    <Clock className="w-3.5 h-3.5" /> {formatTimer(timeLeft)}
                  </div>
                  <button
                    onClick={() => setActiveTestId(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              {isTestLoading || !testDetail ? (
                <div className="py-20 text-center text-gray-400">Loading assessment questions...</div>
              ) : testResult ? (
                /* Result View */
                <div className="space-y-6 text-center py-4">
                  <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg transition-transform animate-bounce">
                    {testResult.passed ? (
                      <div className="w-full h-full rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Trophy className="w-10 h-10" />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <RotateCcw className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                      {testResult.passed ? 'Assessment Passed!' : 'Assessment Completed'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300 max-w-md mx-auto">
                      {testResult.feedbackMessage}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 max-w-sm mx-auto grid grid-cols-2 gap-4 text-center">
                    <div>
                      <span className="text-xs text-gray-400 dark:text-slate-400 uppercase font-semibold">Your Score</span>
                      <p className={`text-3xl font-black mt-1 ${testResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {testResult.score}%
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 dark:text-slate-400 uppercase font-semibold">Passing Score</span>
                      <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                        {testResult.passingScore}%
                      </p>
                    </div>
                  </div>

                  {testResult.badge && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/40 dark:to-emerald-950/40 border border-amber-200 dark:border-amber-800/50 max-w-md mx-auto flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                        <Award className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{testResult.badge.assessmentTitle}</div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{testResult.badge.badgeLevel} • Verified</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        setActiveTestId(null);
                        setTestResult(null);
                      }}
                      className="btn-primary py-2.5 px-6 rounded-xl text-xs font-bold"
                    >
                      Done & Return to Catalog
                    </button>
                    {!testResult.passed && (
                      <button
                        onClick={() => handleStartTest(activeTestId)}
                        className="btn-secondary py-2.5 px-6 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Test Now
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Question View */
                <div className="space-y-6">
                  {/* Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400">
                      <span>Question {currentQuestionIdx + 1} of {testDetail.questions.length}</span>
                      <span>{Math.round(((currentQuestionIdx + 1) / testDetail.questions.length) * 100)}% Completed</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-primary-600 transition-all duration-300 rounded-full"
                        style={{ width: `${((currentQuestionIdx + 1) / testDetail.questions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Question */}
                  {(() => {
                    const q = testDetail.questions[currentQuestionIdx];
                    if (!q) return null;
                    const selected = selectedAnswers[q.id];

                    return (
                      <div className="space-y-5 pt-2">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                          {q.question}
                        </h4>

                        <div className="space-y-2.5">
                          {q.options.map((opt, oIdx) => {
                            const isChosen = selected === oIdx;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectOption(q.id, oIdx)}
                                className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-start gap-3 ${
                                  isChosen
                                    ? 'border-primary-600 bg-primary-50/40 dark:bg-primary-950/40 text-primary-950 dark:text-primary-200 font-semibold shadow-xs ring-1 ring-primary-600'
                                    : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isChosen
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                                  }`}
                                >
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Navigation Footer */}
            {!testResult && testDetail && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentQuestionIdx < testDetail.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                    className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitTest}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {isSubmitting ? 'Grading Answers...' : 'Submit Assessment'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

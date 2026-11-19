import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '@/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Forgot your password?</h1>
            <p className="text-slate-400 text-sm mb-6">
              Enter your email and we'll send a reset link. Valid for 1 hour.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Reset Link
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-6">
              Remembered it?{' '}
              <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle className="w-14 h-14 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-slate-300 text-sm mb-6">
              If <span className="text-indigo-300 font-medium">{email}</span> is registered,
              you'll receive a reset link shortly. Check your spam folder if you don't see it.
            </p>
            <button onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

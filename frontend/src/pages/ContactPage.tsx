import { useState } from 'react';
import { Mail, MessageSquare, Shield, Clock, Send, CheckCircle2, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    // Simulate API dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success('Your message has been sent! Our team will reply shortly.');
    }, 700);
  };

  const faqs = [
    {
      q: 'How does MarketForge escrow protect my money?',
      a: 'Client funds are locked securely in our double-entry escrow ledger when an order starts. Sellers do not receive payment until the client verifies deliverables or the milestone is auto-released after review.',
    },
    {
      q: 'How do I raise a dispute on an order?',
      a: 'Go to your Order Workspace and click "Open Dispute". Both parties can submit settlement offers, or request binding admin arbitration if an agreement cannot be reached.',
    },
    {
      q: 'What are the platform fees?',
      a: 'MarketForge charges a flat 10% platform fee on completed seller orders. Clients pay zero deposit fees and only the milestone cost agreed upon.',
    },
    {
      q: 'How quickly will customer support respond?',
      a: 'Our priority arbitration and escrow support desk responds to urgent order issues within 2 hours, 24/7. General inquiries are answered within 12 hours.',
    },
  ];

  return (
    <div className="w-full bg-slate-50/50 py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
            <MessageSquare size={13} /> We're Here to Help
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Contact MarketForge Support
          </h1>
          <p className="mt-3 text-slate-600 text-base sm:text-lg">
            Have questions about our milestone escrow, need help with an active order, or want to discuss enterprise partnerships?
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Contact Channels & FAQs (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Email Support</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Direct contact for general queries</p>
                  <a href="mailto:support@marketforge.dev" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-1 inline-block">
                    support@marketforge.dev
                  </a>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Escrow & Disputes Desk</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Priority arbitration for funded orders</p>
                  <a href="mailto:disputes@marketforge.dev" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 mt-1 inline-block">
                    disputes@marketforge.dev
                  </a>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Response Time</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Order issues: &lt; 2 hrs SLA</p>
                  <span className="text-xs font-medium text-purple-700 mt-1 inline-block">
                    24/7 Global Availability
                  </span>
                </div>
              </div>
            </div>

            {/* Quick FAQs */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                <HelpCircle size={18} className="text-indigo-600" /> Frequently Asked Questions
              </h3>
              <div className="space-y-4">
                {faqs.map((f, i) => (
                  <div key={i} className="pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                    <h4 className="text-xs font-bold text-slate-800">{f.q}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
            {isSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Message Received!</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Thank you for reaching out, <span className="font-semibold text-slate-800">{name}</span>. A support agent has been assigned to ticket and will follow up with you at <span className="font-semibold text-slate-800">{email}</span>.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setSubject('');
                      setMessage('');
                    }}
                    className="btn-primary text-sm px-6 py-2.5 rounded-xl font-bold"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Send Us a Message</h2>
                  <p className="text-xs text-slate-500 mt-1">Fill out the details below and we'll route your ticket to the right department.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white"
                    >
                      <option value="general">General Support</option>
                      <option value="escrow">Milestone Escrow & Payment</option>
                      <option value="dispute">Order Dispute Arbitration</option>
                      <option value="seller">Seller Badges & Verification</option>
                      <option value="enterprise">Enterprise Partnerships</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Question regarding order escrow..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or issue in detail. If this is about an active order, please include the order ID..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full font-bold text-sm text-white py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  }}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={16} /> Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

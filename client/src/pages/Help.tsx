import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Search, Send } from 'lucide-react';
import { tokens } from '../lib/tokens';

const { colors, text, type, radii } = tokens;

type FAQ = { id: number; question: string; answer: string; category: string };

export const Help = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/faqs')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setFaqs(res.data);
      })
      .catch(() => {});

    fetch('/api/faqs/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  const allCats = ['All', ...categories];

  const filtered = faqs.filter((f) => {
    if (cat !== 'All' && f.category !== cat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!f.question.toLowerCase().includes(q) && !f.answer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped: Record<string, FAQ[]> = {};
  filtered.forEach((f) => {
    const key = f.category ?? 'General';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    setAiResponse(null);
    setAskError(null);
    try {
      const res = await fetch('/api/faqs/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResponse(data.data.aiResponse);
        setQuestion('');
      } else {
        setAskError(data.error ?? 'Something went wrong.');
      }
    } catch {
      setAskError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
          <HelpCircle size={13} /> HELP CENTER
        </div>
        <h1 style={{ fontFamily: type.font.display, fontSize: '2.4rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>How Can We Help?</h1>
        <p style={{ color: text.secondary, fontSize: '0.88rem', margin: 0 }}>Find answers to common questions about HERS365.</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: text.tertiary }} />
        <input className="k-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs..." style={{ width: '100%', padding: '10px 12px 10px 36px' }} />
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 24, flexWrap: 'wrap' }}>
        {allCats.map((c) => (
          <motion.button key={c} whileTap={{ scale: 0.94 }} onClick={() => setCat(c)} style={{ padding: '5px 12px', borderRadius: radii.full, border: 'none', background: cat === c ? colors.accent : 'rgba(255,255,255,0.05)', color: cat === c ? colors.accentOn : text.secondary, fontSize: '0.7rem', fontWeight: type.weight.bold, cursor: 'pointer' }}>{c}</motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '36px', color: text.tertiary, fontSize: '0.85rem' }}>No FAQs match your search.</div>
      )}

      {cat === 'All'
        ? Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: text.tertiary, marginBottom: 10 }}>{group}</div>
              <FaqList faqs={items} open={open} setOpen={setOpen} />
            </div>
          ))
        : <FaqList faqs={filtered} open={open} setOpen={setOpen} />
      }

      <div style={{ marginTop: 48, borderTop: `1px solid ${colors.border}`, paddingTop: 36 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent, marginBottom: 6 }}>ASK A QUESTION</div>
        <h2 style={{ fontFamily: type.font.display, fontSize: '1.6rem', fontWeight: type.weight.bold, textTransform: 'uppercase', margin: '0 0 16px', lineHeight: 1 }}>Didn't Find Your Answer?</h2>

        <form onSubmit={submitQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            className="k-input"
            rows={4}
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', resize: 'vertical' }}
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={submitting || !question.trim()}
            className="k-btn k-btn-primary"
            style={{ padding: '11px 22px', borderRadius: radii.sm, fontSize: '0.85rem', fontFamily: type.font.display, letterSpacing: '0.06em', textTransform: 'uppercase', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, opacity: submitting || !question.trim() ? 0.5 : 1, cursor: submitting || !question.trim() ? 'not-allowed' : 'pointer' }}
          >
            <Send size={14} /> {submitting ? 'Sending...' : 'Ask Question'}
          </motion.button>
        </form>

        <AnimatePresence>
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: 16, padding: '16px 18px', background: `${colors.accent}12`, border: `1px solid ${colors.accent}40`, borderRadius: radii.md }}
            >
              <div style={{ fontSize: '0.62rem', fontWeight: type.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.accent, marginBottom: 8 }}>HERS365 Response</div>
              <p style={{ fontSize: '0.85rem', color: text.primary, lineHeight: 1.65, margin: 0 }}>{aiResponse}</p>
            </motion.div>
          )}
          {askError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,90,90,0.08)', border: '1px solid rgba(255,90,90,0.25)', borderRadius: radii.sm, fontSize: '0.83rem', color: colors.dangerText }}
            >
              {askError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function FaqList({ faqs, open, setOpen }: { faqs: FAQ[]; open: number | null; setOpen: (n: number | null) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {faqs.map((faq) => (
        <div key={faq.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${open === faq.id ? `${colors.accent}40` : colors.border}`, borderRadius: radii.md, overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <button onClick={() => setOpen(open === faq.id ? null : faq.id)} style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: type.weight.bold, color: open === faq.id ? text.primary : text.secondary, textAlign: 'left', lineHeight: 1.4 }}>{faq.question}</span>
            {open === faq.id ? <ChevronUp size={16} color={colors.accent} /> : <ChevronDown size={16} color={text.tertiary} />}
          </button>
          <AnimatePresence>
            {open === faq.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0 18px 16px', fontSize: '0.83rem', color: text.secondary, lineHeight: 1.65 }}>{faq.answer}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

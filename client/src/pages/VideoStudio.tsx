import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Upload, Play, Pause, Tag, ChevronRight, CheckCircle2, X, Plus } from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Input } from '../components/ui';

const DISP = t.font.display;

type Step = 'upload' | 'details' | 'publish';

const TAG_OPTIONS = ['Highlight', 'TD', 'Route', 'Defense', 'Speed', 'Training', 'Game Film', '7v7'];

export const VideoStudio = () => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('video/')) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep('details');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]);
  };

  const publish = async () => {
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setUploading(false);
    setPublished(true);
    setStep('publish');
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setTitle('');
    setTags([]);
    setPublished(false);
    setStep('upload');
    setPlaying(false);
  };

  const STEPS: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'details', label: 'Details' },
    { id: 'publish', label: 'Publish' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
          <Video size={13} /> VIDEO STUDIO
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Post Your Highlight.
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.base, margin: 0 }}>Upload game film, training clips, or reels. Coaches see your best moments.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = STEPS.findIndex((x) => x.id === step) > i;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? colors.accent : active ? `${colors.accent}22` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${done || active ? colors.accent : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: t.size.xs, fontWeight: t.weight.bold, color: done ? colors.accentOn : active ? colors.accent : colors.textSecondary, flexShrink: 0 }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: t.size.sm, fontWeight: active ? t.weight.bold : t.weight.medium, color: active ? colors.textPrimary : colors.textTertiary }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} color={colors.border} style={{ margin: '0 8px' }} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? colors.accent : colors.border}`,
                borderRadius: radii.lg, padding: '52px 32px', textAlign: 'center',
                background: dragOver ? `${colors.accent}08` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <Upload size={36} color={dragOver ? colors.accent : colors.textTertiary} style={{ marginBottom: 14 }} />
              <div style={{ fontFamily: DISP, fontSize: t.size.xl, fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
                {dragOver ? 'Drop to Upload' : 'Upload Your Clip'}
              </div>
              <div style={{ color: colors.textSecondary, fontSize: t.size.base, marginBottom: 16 }}>Drag & drop or tap to browse — MP4, MOV, up to 500 MB</div>
              <motion.div whileTap={{ scale: 0.96 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: colors.accent, color: colors.accentOn, borderRadius: radii.pill, fontSize: t.size.base, fontWeight: t.weight.bold, fontFamily: DISP, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <Plus size={14} /> Choose File
              </motion.div>
            </div>

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { title: 'Highlight Clips', desc: 'Best plays from games' },
                { title: 'Training Film', desc: 'Route work, drills, conditioning' },
                { title: 'Game Reels', desc: 'Full drive or red zone series' },
              ].map((c) => (
                <div key={c.title} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: '14px 14px' }}>
                  <div style={{ fontSize: t.size.base, fontWeight: t.weight.bold, color: colors.textPrimary, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: t.size.sm, color: colors.textTertiary }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* DETAILS STEP */}
        {step === 'details' && file && previewUrl && (
          <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Video preview */}
            <div style={{ position: 'relative', borderRadius: radii.lg, overflow: 'hidden', background: colors.surface0, marginBottom: 20, aspectRatio: '16/9' }}>
              <video ref={videoRef} src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onEnded={() => setPlaying(false)} />
              <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', padding: 0, background: playing ? 'transparent' : 'rgba(0,0,0,0.4)' }}>
                {!playing && (
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={22} color={colors.accentOn} fill={colors.accentOn} />
                  </div>
                )}
              </button>
              {playing && (
                <button onClick={togglePlay} aria-label="Pause video" style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textPrimary }}>
                  <Pause size={16} />
                </button>
              )}
              <button onClick={reset} aria-label="Remove video" style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textPrimary }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }}>Title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Route running vs Oak Hill — Week 4" maxLength={80} className="mb-[18px]" />

              <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 10 }}>
                <Tag size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {TAG_OPTIONS.map((tag) => (
                  <motion.button key={tag} whileTap={{ scale: 0.93 }} onClick={() => toggleTag(tag)} style={{ padding: '5px 12px', borderRadius: radii.pill, border: 'none', cursor: 'pointer', background: tags.includes(tag) ? colors.accent : 'rgba(255,255,255,0.06)', color: tags.includes(tag) ? colors.accentOn : colors.textSecondary, fontSize: t.size.sm, fontWeight: t.weight.bold }}>{tag}</motion.button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={reset} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: radii.sm, color: colors.textSecondary, fontSize: t.size.base, fontWeight: t.weight.semibold, cursor: 'pointer', flex: 0 }}>Back</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={publish} disabled={!title.trim() || uploading} style={{ flex: 1, padding: '12px 24px', background: title.trim() ? colors.accent : `${colors.accent}4d`, color: colors.accentOn, border: 'none', borderRadius: radii.sm, fontSize: t.size.md, fontWeight: t.weight.bold, fontFamily: DISP, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: title.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {uploading ? (
                  <><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: colors.accentOn, animation: 'spin 0.8s linear infinite' }} />Uploading…</>
                ) : 'Publish Clip'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* PUBLISH STEP */}
        {step === 'publish' && published && (
          <motion.div key="publish" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '32px 24px' }}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }}>
              <CheckCircle2 size={52} color={colors.success} style={{ marginBottom: 18 }} />
            </motion.div>
            <h2 style={{ fontFamily: DISP, fontSize: t.size['2xl'], fontWeight: t.weight.bold, textTransform: 'uppercase', margin: '0 0 10px' }}>Clip Published!</h2>
            <p style={{ color: colors.textSecondary, fontSize: t.size.md, marginBottom: 28 }}>"{title}" is live on your profile and visible to coaches.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={reset} style={{ padding: '11px 22px', background: colors.accent, color: colors.accentOn, border: 'none', borderRadius: radii.pill, fontSize: t.size.base, fontWeight: t.weight.bold, cursor: 'pointer' }}>Upload Another</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} style={{ padding: '11px 22px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.border}`, borderRadius: radii.pill, fontSize: t.size.base, color: colors.textSecondary, fontWeight: t.weight.semibold, cursor: 'pointer' }}>View My Profile</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

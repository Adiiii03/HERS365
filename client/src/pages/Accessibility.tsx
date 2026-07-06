import { Eye } from 'lucide-react';
import { tokens } from '../lib/tokens';
import { Card } from '../components/ui';

const { colors, text, type } = tokens;

const SECTIONS = [
  { title: 'Our Commitment', body: "HERS365 is committed to making our platform accessible to all athletes, parents, and coaches — regardless of ability. We follow WCAG 2.1 Level AA guidelines." },
  { title: 'Keyboard Navigation', body: 'All interactive elements are reachable and operable via keyboard. Tab order follows the natural reading flow. Focus indicators are visible on all interactive components.' },
  { title: 'Screen Reader Support', body: 'We use semantic HTML and ARIA labels to ensure compatibility with screen readers including VoiceOver (iOS/macOS) and TalkBack (Android).' },
  { title: 'Color & Contrast', body: 'Text meets a minimum 4.5:1 contrast ratio against backgrounds. Color is never the sole means of conveying information — icons, labels, and patterns complement color cues.' },
  { title: 'Video & Media', body: 'Highlight videos include caption support where available. Audio-only content has text transcripts. Autoplay is disabled by default.' },
  { title: 'Report an Issue', body: 'If you encounter an accessibility barrier on HERS365, contact us at accessibility@hers365.com. We aim to respond within 3 business days and resolve issues within 30 days.' },
];

export const Accessibility = () => (
  <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
        <Eye size={13} /> ACCESSIBILITY
      </div>
      <h1 style={{ fontFamily: type.font.display, fontSize: '2.2rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>Accessibility Statement</h1>
      <p style={{ color: text.secondary, fontSize: '0.82rem', margin: 0 }}>WCAG 2.1 Level AA · Last reviewed June 2025</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ padding: '18px 22px' }}>
          <h3 style={{ fontFamily: type.font.display, fontSize: '1rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px', color: text.primary }}>{s.title}</h3>
          <p style={{ color: text.secondary, fontSize: type.size.base, margin: 0, lineHeight: 1.65 }}>{s.body}</p>
        </Card>
      ))}
    </div>
  </div>
);

import { Flame, Shield, Users, Trophy, TrendingUp, Heart } from 'lucide-react';
import { tokens } from '../lib/tokens';
import { Card } from '../components/ui';

const { colors, text, type } = tokens;

export const About = () => (
  <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 40, textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
        <Flame size={13} /> OUR STORY
      </div>
      <h1 style={{ fontFamily: type.font.display, fontSize: 'clamp(2.2rem, 6vw, 3.2rem)', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1 }}>
        Built for the Girls Who Run.
      </h1>
      <p style={{ color: text.secondary, fontSize: '0.92rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
        HERS365 is the first digital platform built exclusively for girls in flag football. We exist to give young athletes the tools, visibility, and community they deserve — and to connect them with the opportunities that were never built for them before.
      </p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 48 }}>
      {[
        { icon: <Users size={22} />, stat: '12,000+', label: 'Athletes on Platform' },
        { icon: <Trophy size={22} />, stat: '47', label: 'College Programs' },
        { icon: <TrendingUp size={22} />, stat: '3,200+', label: 'Rankings Tracked' },
        { icon: <Shield size={22} />, stat: '100%', label: 'Safe & COPPA Compliant' },
      ].map((s) => (
        <Card key={s.label} style={{ padding: '22px 20px', textAlign: 'center' }}>
          <div style={{ color: colors.accent, marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
          <div style={{ fontFamily: type.font.display, fontSize: '2rem', fontWeight: type.weight.bold, color: text.primary, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.stat}</div>
          <div style={{ fontSize: '0.65rem', color: text.secondary, fontWeight: type.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
        </Card>
      ))}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[
        { icon: <Heart size={18} />, title: 'Why We Built This', body: "Girls flag football is the fastest-growing sport in the country. Yet for years, female athletes had no platform built for them — no rankings, no recruiting tools, no community. We built HERS365 to change that." },
        { icon: <Shield size={18} />, title: 'Safety First, Always', body: "Every feature we build passes a safeguarding review. Coach-to-athlete communication is gated through parents. Your data is yours. We comply with COPPA and FERPA and we'll never compromise on the safety of our athletes." },
        { icon: <TrendingUp size={18} />, title: "What's Next", body: "We're expanding to all 50 states. We're adding real-time GameDay scoring. We're partnering with college programs to bring verified recruiting pipelines to every athlete — regardless of their school or zip code." },
      ].map((s) => (
        <Card key={s.title} style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: colors.accent }}>
            {s.icon}
            <span style={{ fontFamily: type.font.display, fontSize: '1.1rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', color: text.primary }}>{s.title}</span>
          </div>
          <p style={{ color: text.secondary, fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>{s.body}</p>
        </Card>
      ))}
    </div>
  </div>
);

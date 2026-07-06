import { Cookie } from 'lucide-react';
import { tokens } from '../lib/tokens';
import { Card } from '../components/ui';

const { colors, text, type } = tokens;

const SECTIONS = [
  { title: 'What Are Cookies', body: 'Cookies are small text files stored on your device when you visit HERS365. They help us remember your login session, preferences, and usage patterns.' },
  { title: 'Essential Cookies', body: 'We use session cookies to keep you logged in and security cookies to protect your account. These are required for the platform to function and cannot be disabled.' },
  { title: 'Analytics Cookies', body: 'We use anonymous analytics to understand how athletes use the platform — which features are popular, where users encounter issues. No personally identifiable information is stored.' },
  { title: 'No Third-Party Ad Cookies', body: 'We do not use advertising cookies or sell your data to advertisers. Because our platform serves minors, we apply the strictest privacy standards to all data collection.' },
  { title: 'Managing Cookies', body: 'You can clear cookies via your browser settings at any time. Clearing essential cookies will log you out of the platform. Analytics cookies can be declined in your account settings.' },
  { title: 'COPPA Compliance', body: 'For users under 13, we collect only the minimum data necessary for platform operation. No tracking or analytics cookies are applied to under-13 accounts without verifiable parental consent.' },
];

export const CookiePolicy = () => (
  <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
        <Cookie size={13} /> COOKIE POLICY
      </div>
      <h1 style={{ fontFamily: type.font.display, fontSize: '2.2rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>Cookie Policy</h1>
      <p style={{ color: text.secondary, fontSize: '0.82rem', margin: 0 }}>Last updated: June 2025</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ padding: '18px 22px' }}>
          <h3 style={{ fontFamily: type.font.display, fontSize: '1rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px', color: text.primary }}>{s.title}</h3>
          <p style={{ color: text.secondary, fontSize: type.size.base, margin: 0, lineHeight: 1.65 }}>{s.body}</p>
        </Card>
      ))}
    </div>
  </div>
);

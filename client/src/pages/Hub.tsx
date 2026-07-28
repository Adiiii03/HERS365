import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass, Video, Dumbbell, Calendar, BookOpen, Search,
  Users, Briefcase, GraduationCap, Trophy, Medal, Star
} from 'lucide-react';
import { colors, radii, type as t } from '../lib/tokens';
import { variants } from '../lib/motion';

const features = [
  { path: '/recruiting', label: 'Recruiting Center', icon: Search, color: '#ff4081', desc: 'Find coaches, track college interest, and manage your recruiting pipeline.' },
  { path: '/video-studio', label: 'Video Studio', icon: Video, color: '#8b3bff', desc: 'Upload, trim, and organize your best highlights for recruiters.' },
  { path: '/drills', label: 'Combine Prep & Drills', icon: Dumbbell, color: '#00e5ff', desc: 'Improve your 40-yard dash, shuttle, and vertical with expert drills.' },
  { path: '/events', label: 'Events & Combines', icon: Calendar, color: '#f5a623', desc: 'Discover upcoming HERS365 combines and flag football showcases.' },
  { path: '/scholarships', label: 'Scholarship Tracker', icon: GraduationCap, color: '#2ed573', desc: 'Find and apply for flag football and academic scholarships.' },
  { path: '/nil', label: 'NIL Guide & Deals', icon: Briefcase, color: '#ffd32a', desc: 'Learn how to build your brand and calculate your NIL value.' },
  { path: '/squads', label: 'Squads & Leagues', icon: Users, color: '#ff4757', desc: 'Connect with local teams, 7v7 squads, and flag football leagues.' },
  { path: '/maxpreps', label: 'MaxPreps Verified', icon: Medal, color: '#3742fa', desc: 'Lookup and sync your official verified MaxPreps high school stats.' },
  { path: '/college-fit', label: 'College Fit Calculator', icon: BookOpen, color: '#ffa502', desc: 'Match with the perfect college program based on your GPA and stats.' }
];

const DISP = t.font.display;

export const Hub = () => {
  return (
    <div style={{ background: colors.surface0, minHeight: '100vh', padding: 'env(safe-area-inset-top) 20px 100px', color: colors.textPrimary, fontFamily: t.font.body, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', paddingTop: 30 }}>
        
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: radii.full, background: 'rgba(139,59,255,0.1)', color: colors.accent, marginBottom: 16 }}>
            <Compass size={28} />
          </div>
          <h1 style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', lineHeight: 0.9, letterSpacing: '0.02em', margin: 0, textShadow: '0 10px 30px rgba(139,59,255,0.3)' }}>
            THE <span style={{ color: colors.accent }}>HUB</span>
          </h1>
          <p style={{ marginTop: 12, fontSize: t.size.base, color: colors.textSecondary, maxWidth: 500, margin: '12px auto 0' }}>
            Your central command for all HERS365 features. Tap a module to dive into your next big opportunity.
          </p>
        </div>

        <motion.div
          variants={variants.listStagger.container}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div key={feat.path} variants={variants.listStagger.item}>
                <Link to={feat.path} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: radii.md,
                    padding: 24,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = feat.color;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 15px 35px ${feat.color}25`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ 
                      width: 48, height: 48, borderRadius: radii.full, 
                      background: `${feat.color}15`, color: feat.color, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16
                    }}>
                      <Icon size={22} />
                    </div>
                    
                    <h3 style={{ 
                      fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', 
                      fontSize: t.size.lg, margin: '0 0 8px 0', color: colors.textPrimary 
                    }}>
                      {feat.label}
                    </h3>
                    
                    <p style={{ 
                      fontSize: t.size.sm, color: colors.textSecondary, 
                      lineHeight: 1.5, margin: 0, flex: 1 
                    }}>
                      {feat.desc}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

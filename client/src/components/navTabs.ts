import React from 'react';
import { LayoutGrid, Trophy, User, Dumbbell, MessageSquare, Compass } from 'lucide-react';

export interface NavTab {
  icon: React.ElementType;
  label: string;
  path: string;
}

export const defaultAthleteTabs: NavTab[] = [
  { icon: LayoutGrid,    label: 'Grid',     path: '/feed' },
  { icon: Trophy,        label: 'Rankings', path: '/rankings' },
  { icon: Compass,       label: 'Hub',      path: '/hub' },
  { icon: User,          label: 'Profile',  path: '/profile' },
  { icon: Dumbbell,      label: 'Train',    path: '/training' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
];

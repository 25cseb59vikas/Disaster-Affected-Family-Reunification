import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenId } from '../types';
import { UserPlus, Search, Users, AlertTriangle } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'register' | 'search' | 'matches' | 'priority';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
  const { navigateTo } = useApp();

  const navItems: Array<{
    id: 'register' | 'search' | 'matches' | 'priority';
    target: ScreenId;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'register',
      target: 'register_choose_type',
      label: 'Register',
      icon: <UserPlus className="w-6 h-6 stroke-[2]" />
    },
    {
      id: 'search',
      target: 'search_records',
      label: 'Search',
      icon: <Search className="w-6 h-6 stroke-[2]" />
    },
    {
      id: 'matches',
      target: 'suggested_matches',
      label: 'Matches',
      icon: <Users className="w-6 h-6 stroke-[2]" />
    },
    {
      id: 'priority',
      target: 'priority_cases',
      label: 'Priority',
      icon: <AlertTriangle className="w-6 h-6 stroke-[2]" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-borderSlate z-30 max-w-lg mx-auto shadow-lg">
      <div className="grid grid-cols-4 h-16">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.target)}
              className={`flex flex-col items-center justify-center min-h-[48px] px-2 py-1 transition-colors select-none ${
                isActive
                  ? 'text-navy font-bold border-t-2 border-navy -mt-[1px]'
                  : 'text-navy-muted font-medium hover:text-navy'
              }`}
            >
              <div className={isActive ? 'text-navy' : 'text-navy-muted'}>
                {item.icon}
              </div>
              <span className={`text-[13px] leading-tight mt-1 ${isActive ? 'font-bold' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

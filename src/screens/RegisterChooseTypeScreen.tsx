import React from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';

export const RegisterChooseTypeScreen: React.FC = () => {
  const { navigateTo, setRegistrationType } = useApp();

  const handleSelectType = (type: 'found' | 'missing') => {
    setRegistrationType(type);
    navigateTo('register_speak');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto">
      <div>
        <TopBar />

        <main className="p-6 pt-8">
          <h1 className="text-[28px] font-bold text-navy leading-tight text-left mb-8">
            Register
          </h1>

          <div className="space-y-5">
            {/* Button 1: Person found here */}
            <button
              type="button"
              data-path="register-found"
              onClick={() => handleSelectType('found')}
              className="w-full min-h-[100px] p-6 rounded-card bg-surface border border-borderSlate hover:border-navy text-left shadow-subtle hover:shadow transition-all group flex flex-col justify-center cursor-pointer active:bg-slate-50"
            >
              <span className="text-[22px] font-bold text-navy group-hover:text-terracotta transition-colors">
                Person found here
              </span>
              <span className="text-[18px] text-navy-muted mt-1 leading-normal">
                Someone who has arrived at this site
              </span>
            </button>

            {/* Button 2: Looking for someone */}
            <button
              type="button"
              data-path="register-missing"
              onClick={() => handleSelectType('missing')}
              className="w-full min-h-[100px] p-6 rounded-card bg-surface border border-borderSlate hover:border-navy text-left shadow-subtle hover:shadow transition-all group flex flex-col justify-center cursor-pointer active:bg-slate-50"
            >
              <span className="text-[22px] font-bold text-navy group-hover:text-terracotta transition-colors">
                Looking for someone
              </span>
              <span className="text-[18px] text-navy-muted mt-1 leading-normal">
                A family member is searching
              </span>
            </button>
          </div>
        </main>
      </div>

      <div className="h-20" />
      <BottomNav activeTab="register" />
    </div>
  );
};

import React from 'react';
import { Goal } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  goals: Goal[];
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenCreateProject: () => void;
  onNavigateToSelection: () => void;
  onNavigateToLanding: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  goals, 
  isDarkMode, 
  toggleTheme, 
  onOpenCreateProject,
  onNavigateToSelection,
  onNavigateToLanding
}) => {
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 transition-all duration-200">
      <div className="p-6 flex items-center gap-3">
        <img 
            src="https://lh3.googleusercontent.com/d/1bHJPW95-8OOP_AFWVJboqNIFFCvru2e2" 
            alt="Pile Up Logo" 
            className="w-10 h-10 object-contain drop-shadow-sm"
        />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Pile Up
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-6">
        {/* Navigation Section */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Navigation</h3>
          <ul className="space-y-1">
             <li>
              <button
                onClick={onNavigateToLanding}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                     <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    Back to Platform
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={onNavigateToSelection}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    View All Projects
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={() => onViewChange('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                  currentView === 'dashboard' 
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                    <svg className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Dashboard
                </div>
              </button>
            </li>
          </ul>
        </div>

        {/* Projects List (Quick Switch) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Projects</h3>
            <button 
                onClick={onOpenCreateProject}
                className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                title="Create Project"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <ul className="space-y-1">
            {goals.map(goal => (
              <li key={goal.id}>
                <button
                  onClick={() => onViewChange(goal.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                    currentView === goal.id 
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-sm ${currentView === goal.id ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-400 dark:bg-slate-600 group-hover:bg-slate-600 dark:group-hover:bg-slate-500'}`}></span>
                    <span className="truncate">{goal.title}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {/* Theme Toggle */}
        <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            <span className="flex items-center gap-2">
                {isDarkMode ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                )}
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
        </button>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm px-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                U
            </div>
            <span>User</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
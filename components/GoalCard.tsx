import React from 'react';
import { Goal, GoalType } from '../types';

interface GoalCardProps {
  goal: Goal;
  onAddHours: (hours: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onAddHours }) => {
  const percentage = Math.min(100, Math.round((goal.loggedHours / goal.targetHours) * 100));
  
  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all group shadow-sm dark:shadow-none">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
            goal.type === GoalType.MONTHLY 
            ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' 
            : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
          }`}>
            {goal.type}
          </span>
          <h3 className="text-slate-800 dark:text-white font-bold text-lg mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{goal.title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{goal.description}</p>
        </div>
        <div className="text-right">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{daysRemaining}</div>
            <div className="text-xs text-slate-500 font-medium uppercase">Days Left</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500 dark:text-slate-400">Progress</span>
          <span className="text-slate-700 dark:text-white font-medium">{goal.loggedHours} / {goal.targetHours} hrs</span>
        </div>
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
                percentage >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default GoalCard;
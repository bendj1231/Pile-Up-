import React from 'react';
import { Goal, GoalType, TimeOfDay } from '../types';

interface GoalCardProps {
  goal: Goal;
  onAddHours: (hours: number) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onAddHours }) => {
  const percentage = Math.min(100, Math.round((goal.loggedHours / goal.targetHours) * 100));
  
  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all group shadow-sm dark:shadow-none flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide border ${
            goal.type === GoalType.MONTHLY 
            ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' 
            : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
          }`}>
            {goal.type}
          </span>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mt-3 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{goal.title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-2 min-h-[2.5em]">{goal.description}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{daysRemaining}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Days Left</div>
        </div>
      </div>

      <div className="mb-6 mt-auto">
        <div className="flex justify-between text-xs mb-2 font-medium">
          <span className="text-slate-500 dark:text-slate-400">Progress</span>
          <span className="text-slate-700 dark:text-slate-200">{goal.loggedHours} / {goal.targetHours}h</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
                percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Deadline</span>
             <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        
        {(goal.dailyTarget || (goal.preferredTime && goal.preferredTime !== TimeOfDay.ANY)) && (
            <div className="flex items-center gap-2">
                {goal.dailyTarget && (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Daily</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {goal.dailyTarget}h
                        </span>
                    </div>
                )}
                {goal.preferredTime && goal.preferredTime !== TimeOfDay.ANY && (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Time</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20">
                            {goal.preferredTime}
                        </span>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
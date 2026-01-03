import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Task, TimesheetEntry, TaskCategory } from '../types';

interface CategoryDistributionChartProps {
  // Can accept either Tasks (internal) or Entries (universal)
  tasks?: Task[];
  entries?: TimesheetEntry[];
  title?: string;
  variant?: 'card' | 'clean';
}

const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({ tasks, entries, title = "Time by Category", variant = 'card' }) => {
  
  let dataMap: Record<string, number> = {};

  if (entries) {
      // Logic for Timesheet Entries
      dataMap = entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + entry.durationMinutes;
        return acc;
      }, {} as Record<string, number>);
  } else if (tasks) {
      // Logic for Tasks
      dataMap = tasks.reduce((acc, task) => {
        const minutes = task.actualDurationMinutes || 0;
        if (minutes > 0) {
            acc[task.category] = (acc[task.category] || 0) + minutes;
        }
        return acc;
      }, {} as Record<string, number>);
  }

  const data = Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  
  const COLORS: Record<string, string> = {
    [TaskCategory.RESEARCH]: '#f97316', // orange-500
    [TaskCategory.CREATION]: '#3b82f6', // blue-500
    [TaskCategory.LEARNING]: '#10b981', // emerald-500
    [TaskCategory.ACTIVITY]: '#facc15', // yellow-400
    [TaskCategory.LEISURE]: '#ef4444',  // red-500
    [TaskCategory.OTHER]: '#94a3b8',    // slate-400
  };

  const containerClasses = variant === 'card' 
    ? "bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full min-h-[300px]"
    : "flex flex-col h-full min-h-[250px]";

  if (data.length === 0) {
      return (
        <div className={containerClasses}>
             <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 self-start">{title}</h3>
             <div className="flex flex-col items-center justify-center flex-1 opacity-50">
                <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <p className="text-slate-400 text-sm italic">No time logged yet.</p>
             </div>
        </div>
      )
  }

  return (
    <div className={containerClasses}>
      <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{title}</h3>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={variant === 'card' ? 60 : 50}
                outerRadius={variant === 'card' ? 80 : 70}
                paddingAngle={5}
                dataKey="value"
            >
                {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.OTHER} stroke="none" />
                ))}
            </Pie>
            <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    color: '#1e293b',
                    fontWeight: '500'
                }}
                itemStyle={{ color: '#1e293b' }}
                formatter={(value: number) => [`${Math.round(value)}m`, 'Time Spent']}
            />
            <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle" 
                wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '600', fontFamily: 'monospace' }}
            />
            </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryDistributionChart;
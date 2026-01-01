import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Goal } from '../types';

interface ProgressChartProps {
  goals: Goal[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-3 rounded-lg shadow-xl">
        <p className="text-slate-800 dark:text-white font-bold text-sm mb-1">{label}</p>
        <p className="text-indigo-500 dark:text-indigo-400 text-xs">
          Completed: {payload[0].value} hrs
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Target: {payload[0].payload.target} hrs
        </p>
      </div>
    );
  }
  return null;
};

const ProgressChart: React.FC<ProgressChartProps> = ({ goals }) => {
  const data = goals.map(g => ({
    name: g.title.length > 10 ? g.title.substring(0, 10) + '...' : g.title,
    fullTitle: g.title,
    current: g.loggedHours,
    target: g.targetHours,
    remaining: Math.max(0, g.targetHours - g.loggedHours)
  }));

  return (
    <div className="w-full h-full min-h-[250px] p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-colors">
        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Goal Distribution</h3>
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
            <XAxis type="number" hide />
            <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} />
            <Bar dataKey="current" stackId="a" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#6366f1" />
                ))}
            </Bar>
            <Bar dataKey="remaining" stackId="a" fill="#e2e8f0" className="dark:fill-slate-700" radius={[0, 4, 4, 0]} />
        </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
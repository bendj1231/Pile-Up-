import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TimesheetEntry, TaskCategory } from '../types';

interface TrendChartProps {
  entries: TimesheetEntry[];
  timeRange: 'day' | 'month' | 'year' | 'all' | 'week';
}

const TrendChart: React.FC<TrendChartProps> = ({ entries, timeRange }) => {
  // Helper to Group Data
  const processData = () => {
    const grouped: { [key: string]: any } = {};

    entries.forEach(entry => {
      const dateObj = new Date(entry.date);
      let key = '';

      if (timeRange === 'day' || timeRange === 'all') {
        key = entry.date; // YYYY-MM-DD
      } else if (timeRange === 'week') {
         // Calculate start of the week (Monday)
         const day = dateObj.getDay() || 7; // Get current day number, converting Sun(0) to 7
         if (day !== 1) dateObj.setHours(-24 * (day - 1)); // Adjust to previous Monday
         const monday = new Date(dateObj);
         // Key format: YYYY-MM-DD of the Monday
         key = monday.toISOString().split('T')[0];
      } else if (timeRange === 'month') {
        key = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (timeRange === 'year') {
        key = `${dateObj.getFullYear()}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          name: key,
          [TaskCategory.RESEARCH]: 0,
          [TaskCategory.CREATION]: 0,
          [TaskCategory.LEARNING]: 0,
          [TaskCategory.ACTIVITY]: 0,
          [TaskCategory.LEISURE]: 0,
          [TaskCategory.OTHER]: 0,
        };
      }

      // Convert minutes to hours for better chart readability
      grouped[key][entry.category] += (entry.durationMinutes / 60);
    });

    // Sort by date
    return Object.values(grouped).sort((a: any, b: any) => a.name.localeCompare(b.name));
  };

  const data = processData();

  const COLORS = {
    [TaskCategory.RESEARCH]: '#f97316', // Orange
    [TaskCategory.CREATION]: '#3b82f6', // Blue
    [TaskCategory.LEARNING]: '#10b981', // Emerald
    [TaskCategory.ACTIVITY]: '#facc15', // Yellow
    [TaskCategory.LEISURE]: '#ef4444',  // Red
    [TaskCategory.OTHER]: '#94a3b8',    // Slate
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Format label based on timeRange
      let displayLabel = label;
      if (timeRange === 'week') {
          const d = new Date(label);
          displayLabel = `Week of ${d.getDate()}/${d.getMonth()+1}`;
      }

      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl">
          <p className="font-bold text-slate-800 dark:text-white mb-2">{displayLabel}</p>
          {payload.map((p: any, index: number) => (
            p.value > 0 && (
              <div key={index} className="flex items-center gap-2 text-xs mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                <span className="text-slate-500 dark:text-slate-400 capitalize">{p.name.toLowerCase()}:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{p.value.toFixed(1)} hrs</span>
              </div>
            )
          ))}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
             <span className="text-xs font-bold text-slate-900 dark:text-white">Total: {payload.reduce((acc: number, curr: any) => acc + curr.value, 0).toFixed(1)} hrs</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <p>No data available for this period.</p>
          </div>
      )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
        <XAxis 
            dataKey="name" 
            tick={{fontSize: 10, fill: '#64748b'}} 
            tickFormatter={(value) => {
                if(timeRange === 'year') return value;
                if(timeRange === 'month') return value; // YYYY-MM
                if(timeRange === 'week') {
                    const d = new Date(value);
                    return `${d.getDate()}/${d.getMonth()+1}`;
                }
                // For daily, just show DD/MM
                const d = new Date(value);
                return `${d.getDate()}/${d.getMonth()+1}`;
            }}
        />
        <YAxis tick={{fontSize: 10, fill: '#64748b'}} label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8'} }} />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} />
        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="circle" />
        
        <Bar dataKey={TaskCategory.RESEARCH} stackId="a" fill={COLORS[TaskCategory.RESEARCH]} />
        <Bar dataKey={TaskCategory.CREATION} stackId="a" fill={COLORS[TaskCategory.CREATION]} />
        <Bar dataKey={TaskCategory.LEARNING} stackId="a" fill={COLORS[TaskCategory.LEARNING]} />
        <Bar dataKey={TaskCategory.ACTIVITY} stackId="a" fill={COLORS[TaskCategory.ACTIVITY]} />
        <Bar dataKey={TaskCategory.LEISURE} stackId="a" fill={COLORS[TaskCategory.LEISURE]} />
        <Bar dataKey={TaskCategory.OTHER} stackId="a" fill={COLORS[TaskCategory.OTHER]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TrendChart;
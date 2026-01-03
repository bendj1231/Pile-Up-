import React, { useState } from 'react';
import { Task, TaskStatus, Goal, TaskCategory } from '../types';

interface DailyChecklistProps {
  tasks: Task[];
  goals: Goal[];
  onTaskClick: (task: Task) => void;
  onAddTask: (title: string, duration: number, category: TaskCategory, goalId?: string) => void;
  onDeleteTask: (id: string) => void;
}

const DailyChecklist: React.FC<DailyChecklistProps> = ({ tasks, goals, onTaskClick, onAddTask, onDeleteTask }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>(TaskCategory.LEARNING);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle, newTaskDuration, newTaskCategory, selectedGoalId || undefined);
      setNewTaskTitle('');
      setNewTaskDuration(30);
      setNewTaskCategory(TaskCategory.LEARNING);
      setSelectedGoalId('');
      setIsAdding(false);
    }
  };

  const getCategoryColor = (cat: TaskCategory) => {
    switch (cat) {
        case TaskCategory.RESEARCH: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        case TaskCategory.CREATION: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case TaskCategory.LEARNING: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case TaskCategory.ACTIVITY: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        case TaskCategory.LEISURE: return 'bg-red-500/10 text-red-400 border-red-500/20';
        case TaskCategory.FILE_SORTING: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        case TaskCategory.DOCUMENTATION: return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
            Daily Tasks
        </h2>
        <button 
            onClick={() => setIsAdding(!isAdding)}
            className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
            {isAdding ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 animate-fade-in">
          <div className="space-y-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              autoFocus
            />
            
            <div className="flex gap-2">
                <select 
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                    {Object.values(TaskCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <div className="relative flex items-center w-24">
                    <input
                        type="number"
                        value={newTaskDuration}
                        onChange={(e) => setNewTaskDuration(parseInt(e.target.value))}
                        min="1"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <span className="absolute right-2 text-slate-500 text-xs">min</span>
                </div>
            </div>

            <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
                <option value="">No Linked Goal</option>
                {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                ))}
            </select>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition-colors"
            >
              Add to Checklist
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {pendingTasks.length === 0 && completedTasks.length === 0 && !isAdding && (
            <div className="text-center py-12 text-slate-500">
                <p>No tasks yet. Start by adding one!</p>
            </div>
        )}

        {pendingTasks.map((task) => (
          <div 
            key={task.id} 
            className="group flex flex-col gap-2 p-4 rounded-xl bg-slate-750 hover:bg-slate-700/50 border border-slate-700/50 hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
            onClick={() => onTaskClick(task)}
          >
            {/* Category Badge - Absolute positioned or top aligned */}
            <div className="flex justify-between items-start">
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${getCategoryColor(task.category)}`}>
                    {task.category}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                        className="text-slate-600 hover:text-red-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-indigo-400 flex items-center justify-center transition-colors">
                         <div className="w-0 h-0 bg-indigo-400 rounded-full group-hover:w-2.5 group-hover:h-2.5 transition-all" />
                    </div>
                    <div>
                        <h3 className="text-slate-200 font-medium group-hover:text-white transition-colors">{task.title}</h3>
                    </div>
                </div>
                <div className="text-xs text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded">
                    {task.plannedDurationMinutes}m
                </div>
            </div>
          </div>
        ))}

        {completedTasks.length > 0 && (
            <div className="pt-4 border-t border-slate-700/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Completed Today</h4>
                <div className="space-y-2 opacity-60">
                    {completedTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-transparent">
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    task.category === TaskCategory.RESEARCH ? 'bg-orange-400' :
                                    task.category === TaskCategory.CREATION ? 'bg-blue-400' :
                                    task.category === TaskCategory.LEARNING ? 'bg-emerald-400' : 
                                    task.category === TaskCategory.ACTIVITY ? 'bg-yellow-400' :
                                    task.category === TaskCategory.LEISURE ? 'bg-red-400' :
                                    task.category === TaskCategory.FILE_SORTING ? 'bg-gray-400' :
                                    task.category === TaskCategory.DOCUMENTATION ? 'bg-cyan-400' :
                                    'bg-slate-400'
                                }`}></span>
                                <span className="text-slate-400 line-through decoration-slate-600 decoration-2 text-sm">{task.title}</span>
                            </div>
                            <span className="text-xs text-emerald-400 font-medium">{task.actualDurationMinutes}m</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DailyChecklist;
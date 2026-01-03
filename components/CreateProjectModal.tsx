import React, { useState, useEffect } from 'react';
import { GoalType, TaskCategory, TimeOfDay } from '../types';
import { categorizeTask } from '../services/geminiService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: any, taskBank: {title: string, category: TaskCategory}[]) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetHours, setTargetHours] = useState(40);
  const [deadline, setDeadline] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [type, setType] = useState<GoalType>(GoalType.MONTHLY);
  const [dailyTarget, setDailyTarget] = useState(1);
  const [preferredTime, setPreferredTime] = useState<TimeOfDay>(TimeOfDay.ANY);
  
  // Task Bank State
  const [bankInput, setBankInput] = useState('');
  const [bankCategory, setBankCategory] = useState<TaskCategory>(TaskCategory.LEARNING);
  const [taskBank, setTaskBank] = useState<{title: string, category: TaskCategory}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Auto-categorize debounced effect
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (bankInput.trim().length > 3) {
            setIsAnalyzing(true);
            try {
                const detectedCategory = await categorizeTask(bankInput);
                setBankCategory(detectedCategory);
            } catch (e) {
                console.error("Auto-categorization failed", e);
            } finally {
                setIsAnalyzing(false);
            }
        }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [bankInput]);

  if (!isOpen) return null;

  const handleAddToBank = () => {
    if (bankInput.trim()) {
      setTaskBank([...taskBank, { title: bankInput.trim(), category: bankCategory }]);
      setBankInput('');
    }
  };

  const handleRemoveFromBank = (index: number) => {
    setTaskBank(taskBank.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title,
      description,
      targetHours,
      deadline,
      type,
      dailyTarget,
      preferredTime
    }, taskBank);
    
    // Reset
    setTitle('');
    setDescription('');
    setTaskBank([]);
    setBankInput('');
    setDailyTarget(1);
    setPreferredTime(TimeOfDay.ANY);
    onClose();
  };

  // Helper for dot colors in dropdown/list
  const getCategoryColor = (cat: TaskCategory) => {
      switch (cat) {
          case TaskCategory.RESEARCH: return 'bg-orange-500';
          case TaskCategory.CREATION: return 'bg-blue-500';
          case TaskCategory.LEARNING: return 'bg-emerald-500';
          case TaskCategory.ACTIVITY: return 'bg-yellow-400';
          case TaskCategory.LEISURE: return 'bg-red-500';
          default: return 'bg-slate-400';
      }
  };

  const getCategoryStyles = (cat: TaskCategory) => {
      switch (cat) {
          case TaskCategory.RESEARCH: return 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
          case TaskCategory.CREATION: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
          case TaskCategory.LEARNING: return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
          case TaskCategory.ACTIVITY: return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
          case TaskCategory.LEISURE: return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
          default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Project</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Define your goal and populate your task bank.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Project Details */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  placeholder="e.g. Flight Training, Web Development..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Hours</label>
                   <input
                    type="number"
                    min="1"
                    value={targetHours}
                    onChange={e => setTargetHours(parseInt(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline</label>
                   <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                   <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Daily Goal (hrs)</label>
                   <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={dailyTarget}
                    onChange={e => setDailyTarget(parseFloat(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg text-center"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Preferred Time</label>
                   <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value as TimeOfDay)}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-center font-medium"
                   >
                       {Object.values(TimeOfDay).map(t => (
                           <option key={t} value={t}>{t}</option>
                       ))}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-5">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as GoalType)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={GoalType.MONTHLY}>Monthly Goal</option>
                        <option value={GoalType.FORECAST}>Long-term Forecast</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Short description"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
               </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Task Bank
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">Auto-Categorization Active</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                    {/* Category Selector with Colors */}
                    <div className="relative group">
                        <select 
                            value={bankCategory}
                            onChange={(e) => setBankCategory(e.target.value as TaskCategory)}
                            className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-8 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-full font-bold text-xs uppercase tracking-wide cursor-pointer transition-colors shadow-sm"
                        >
                             {Object.values(TaskCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300">
                            <div className={`w-3 h-3 rounded-full ${getCategoryColor(bankCategory)} ${isAnalyzing ? 'animate-ping' : ''}`}></div>
                            {isAnalyzing && <div className={`absolute inset-0 w-3 h-3 rounded-full ${getCategoryColor(bankCategory)} opacity-75`}></div>}
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    <input 
                        type="text"
                        value={bankInput}
                        onChange={e => setBankInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddToBank())}
                        placeholder="Add tasks to backlog..."
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <button 
                        type="button"
                        onClick={handleAddToBank}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:transform active:scale-95"
                    >
                        Add
                    </button>
                </div>

                <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-3 min-h-[100px] max-h-[200px] overflow-y-auto border border-dashed border-slate-200 dark:border-slate-700">
                    {taskBank.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <p className="text-sm italic">Task bank is empty.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {taskBank.map((item, idx) => (
                                <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide bg-white dark:bg-slate-900 shadow-sm ${getCategoryStyles(item.category)}`}>
                                    <span>{item.title}</span>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveFromBank(idx)}
                                        className="opacity-60 hover:opacity-100 hover:text-red-500 transition-opacity ml-1"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">Cancel</button>
            <button 
                type="submit" 
                form="project-form"
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5"
            >
                Create Project
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
import React, { useState } from 'react';
import { GoalType, TaskCategory } from '../types';

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
  
  // Task Bank State
  const [bankInput, setBankInput] = useState('');
  const [bankCategory, setBankCategory] = useState<TaskCategory>(TaskCategory.LEARNING);
  const [taskBank, setTaskBank] = useState<{title: string, category: TaskCategory}[]>([]);

  if (!isOpen) return null;

  const handleAddToBank = () => {
    if (bankInput.trim()) {
      setTaskBank([...taskBank, { title: bankInput.trim(), category: bankCategory }]);
      setBankInput('');
      // Optionally rotate category or keep same
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
      type
    }, taskBank);
    
    // Reset
    setTitle('');
    setDescription('');
    setTaskBank([]);
    setBankInput('');
    onClose();
  };

  // Helper for dot colors in dropdown/list
  const getCategoryColor = (cat: TaskCategory) => {
      switch (cat) {
          case TaskCategory.RESEARCH: return 'bg-blue-500';
          case TaskCategory.CREATION: return 'bg-red-500';
          case TaskCategory.LEARNING: return 'bg-emerald-500';
          default: return 'bg-slate-400';
      }
  };

  const getCategoryStyles = (cat: TaskCategory) => {
      switch (cat) {
          case TaskCategory.RESEARCH: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
          case TaskCategory.CREATION: return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
          case TaskCategory.LEARNING: return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
          default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Project</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Define your goal and populate your task bank.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Project Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Flight Training, Web Development..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Hours</label>
                   <input
                    type="number"
                    min="1"
                    value={targetHours}
                    onChange={e => setTargetHours(parseInt(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline</label>
                   <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                   />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as GoalType)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
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
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                    />
                </div>
               </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-bold text-slate-800 dark:text-slate-200">Task Bank</h3>
                    <span className="text-xs text-slate-500">Categorize & Add to Backlog</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                    {/* Category Selector with Colors */}
                    <div className="relative group">
                        <select 
                            value={bankCategory}
                            onChange={(e) => setBankCategory(e.target.value as TaskCategory)}
                            className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-8 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-full font-medium text-sm cursor-pointer"
                        >
                             {Object.values(TaskCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={`w-3 h-3 rounded-full ${getCategoryColor(bankCategory)}`}></div>
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
                        placeholder="Add a task to the bank..."
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        type="button"
                        onClick={handleAddToBank}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Add
                    </button>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-2 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {taskBank.length === 0 ? (
                        <p className="text-center text-slate-400 py-4 text-sm italic">No tasks in bank yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {taskBank.map((item, idx) => (
                                <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${getCategoryStyles(item.category)}`}>
                                    <span>{item.title}</span>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveFromBank(idx)}
                                        className="opacity-60 hover:opacity-100 hover:text-red-500"
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

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium">Cancel</button>
            <button 
                type="submit" 
                form="project-form"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20"
            >
                Create Project
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
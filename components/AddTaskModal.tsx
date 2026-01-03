import React, { useState, useEffect } from 'react';
import { Goal, TaskCategory, Task, Subtask } from '../types';
import { getTaskSuggestions } from '../services/geminiService';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  goals: Goal[];
  initialGoalId?: string;
  taskToEdit?: Task | null;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave, goals, initialGoalId, taskToEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string>('');
  const [duration, setDuration] = useState(30);
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.LEARNING);
  const [goalId, setGoalId] = useState<string>(initialGoalId || '');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isBacklog, setIsBacklog] = useState(false);
  
  // Subtasks State
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskCategory, setNewSubtaskCategory] = useState<TaskCategory>(TaskCategory.LEARNING);

  // Reset or load state when modal opens
  useEffect(() => {
    if (isOpen) {
        if (taskToEdit) {
            // Editing existing task
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setTags(taskToEdit.tags?.join(', ') || '');
            setDuration(taskToEdit.plannedDurationMinutes);
            setCategory(taskToEdit.category);
            setGoalId(taskToEdit.linkedGoalId || '');
            setSubtasks(taskToEdit.subtasks || []);
            setIsBacklog(taskToEdit.isBacklog || false);
            setNewSubtaskCategory(taskToEdit.category); // Default subtask category to parent
        } else {
            // Creating new task
            setTitle('');
            setDescription('');
            setTags('');
            setDuration(30);
            setCategory(TaskCategory.LEARNING);
            setNewSubtaskCategory(TaskCategory.LEARNING);
            // Default to the current project context if available
            setGoalId(initialGoalId || '');
            setSubtasks([]);
            // explicitly default to ACTIVE (not backlog) to ensure it appears in the active list
            setIsBacklog(false);
        }
    }
  }, [isOpen, taskToEdit, initialGoalId]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
        setSubtasks([...subtasks, {
            id: Date.now().toString() + Math.random(),
            title: newSubtaskTitle,
            isCompleted: false,
            category: newSubtaskCategory // Assign selected category
        }]);
        setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      // Auto-add any pending subtask in the input field
      let finalSubtasks = [...subtasks];
      if (newSubtaskTitle.trim()) {
          finalSubtasks.push({
            id: Date.now().toString() + Math.random(),
            title: newSubtaskTitle.trim(),
            isCompleted: false,
            category: newSubtaskCategory
          });
      }

      onSave({
        id: taskToEdit?.id,
        title,
        description,
        tags: tagArray,
        plannedDurationMinutes: duration,
        category,
        linkedGoalId: goalId || undefined,
        subtasks: finalSubtasks,
        isBacklog: isBacklog // Respect the checkbox state
      });
      onClose();
    }
  };

  const handleSuggest = async () => {
    if (!title.trim()) return;
    setIsSuggesting(true);
    try {
        const suggestions = await getTaskSuggestions(title);
        setDescription(suggestions.description);
        setTags(suggestions.tags.join(', '));
        setCategory(suggestions.category);
        setNewSubtaskCategory(suggestions.category); // Sync subtask default
    } catch (e) {
        console.error(e);
    } finally {
        setIsSuggesting(false);
    }
  };

  // Helper for chip styling
  const getCategoryStyles = (cat: TaskCategory, isSelected: boolean) => {
      if (!isSelected) return 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700';
      
      switch (cat) {
          case TaskCategory.RESEARCH: return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700/50';
          case TaskCategory.CREATION: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50';
          case TaskCategory.LEARNING: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50';
          case TaskCategory.ACTIVITY: return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700/50';
          case TaskCategory.LEISURE: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50';
          default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl animate-fade-in-up mb-12" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{taskToEdit ? 'Edit Objective' : 'New Objective'}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 px-4 py-3 text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors rounded-t-lg"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleSuggest}
                        disabled={!title || isSuggesting}
                        className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 dark:border-slate-700 ${
                            isSuggesting 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' 
                            : 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border-indigo-200 dark:border-indigo-500/30'
                        }`}
                        title="AI Auto-Suggest Details"
                    >
                        {isSuggesting ? '...' : '✨ AI Suggest'}
                    </button>
                </div>
            </div>

             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Optional details..."
                />
            </div>

            {/* Subtasks Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Session Objectives / Subtasks</label>
                
                {/* Category Selector Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {Object.values(TaskCategory).map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setNewSubtaskCategory(cat)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all transform hover:scale-105 ${getCategoryStyles(cat, newSubtaskCategory === cat)}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                        placeholder="Add task"
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button 
                        type="button" 
                        onClick={handleAddSubtask}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white w-10 rounded-lg font-bold text-lg transition-colors flex items-center justify-center"
                    >
                        +
                    </button>
                </div>

                <ul className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {subtasks.map(sub => (
                        <li key={sub.id} className="flex items-center justify-between text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                    sub.category === TaskCategory.RESEARCH ? 'bg-orange-500' :
                                    sub.category === TaskCategory.CREATION ? 'bg-blue-500' :
                                    sub.category === TaskCategory.LEARNING ? 'bg-emerald-500' : 
                                    sub.category === TaskCategory.ACTIVITY ? 'bg-yellow-400' :
                                    sub.category === TaskCategory.LEISURE ? 'bg-red-500' : 'bg-slate-400'
                                }`}></div>
                                <span className="text-slate-700 dark:text-slate-300 truncate">{sub.title}</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveSubtask(sub.id)} className="text-slate-400 hover:text-red-500 ml-2">
                                &times;
                            </button>
                        </li>
                    ))}
                    {subtasks.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No tasks added yet.</p>}
                </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="comma separated"
                    />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as TaskCategory)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                        {Object.values(TaskCategory).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (min)</label>
                    <input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
                    <select
                        value={goalId}
                        onChange={(e) => setGoalId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                        <option value="">Inbox (No Project)</option>
                        {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
                <input 
                    type="checkbox" 
                    id="isBacklog" 
                    checked={isBacklog} 
                    onChange={e => setIsBacklog(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isBacklog" className="text-sm text-slate-600 dark:text-slate-300">Add to Task Bank (Backlog)</label>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm">Cancel</button>
             <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all text-sm">
                {taskToEdit ? 'Save Changes' : 'Create Objective'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
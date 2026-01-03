import React, { useState, useRef, useEffect } from 'react';
import { Task, Goal, TaskStatus, TaskCategory, Subtask } from '../types';
import { categorizeTask } from '../services/geminiService';

interface PaperViewProps {
  viewMode: 'all' | string; // 'all' or goalId
  goals: Goal[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleBacklog: (task: Task) => void;
  onAddTask: (task: Partial<Task>) => void;
  onOpenAddModal?: () => void;
  onMoveSubtasksToBank?: (subtasks: Subtask[], goalId?: string) => void;
}

interface ExpandedTaskCardProps {
    task: Task;
    isNew?: boolean;
    onSave: (task: Task, shouldClose?: boolean) => void;
    onCancel: () => void;
    onStartFocus?: () => void;
    onDelete?: () => void;
    backlogTasks?: Task[];
    onConsumeBacklogTask?: (id: string) => void;
    onMoveSubtasksToBank?: (subtasks: Subtask[], goalId?: string) => void;
}

// FIX: Moved ExpandedTaskCard and its related components before they are used in TaskItem and InlineTaskEditor to prevent reference errors.
const ExpandedTaskCard: React.FC<ExpandedTaskCardProps> = ({ task, isNew, onSave, onCancel, onStartFocus, onDelete, backlogTasks, onConsumeBacklogTask, onMoveSubtasksToBank }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [duration, setDuration] = useState(task.plannedDurationMinutes);
    const [category, setCategory] = useState(task.category);
    const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
    const [newSubtask, setNewSubtask] = useState('');
    const [newSubtaskCategory, setNewSubtaskCategory] = useState<TaskCategory>(task.category);
    
    // Suggestion State
    const [showBacklogSuggestions, setShowBacklogSuggestions] = useState(false);

    // Focus Mode State
    const [isFocusing, setIsFocusing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(task.plannedDurationMinutes * 60);
    const [isReviewing, setIsReviewing] = useState(false);
    
    // Quick Start State (Specific to Subtask)
    const [quickStartId, setQuickStartId] = useState<string | null>(null);
    const [quickStartDuration, setQuickStartDuration] = useState<number>(25);
    
    // Track active subtask for recording time
    const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
    const subtaskElapsedRef = useRef<{[id: string]: number}>({}); // Store accumulated seconds temporarily

    // Auto focus title on new
    const titleRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isNew && titleRef.current) titleRef.current.focus();
    }, [isNew]);

    // Initialize subtask actualMinutes if missing
    useEffect(() => {
        if (isFocusing) {
            // Pick first incomplete subtask as default if none selected
            if (!activeSubtaskId) {
                const firstIncomplete = subtasks.find(s => !s.isCompleted);
                if (firstIncomplete) setActiveSubtaskId(firstIncomplete.id);
            }
        }
    }, [isFocusing, activeSubtaskId, subtasks]);

    // Timer Interval
    useEffect(() => {
        let interval: any;
        if (isFocusing && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
                
                // Track time for active subtask
                if (activeSubtaskId) {
                    if (!subtaskElapsedRef.current[activeSubtaskId]) {
                        subtaskElapsedRef.current[activeSubtaskId] = 0;
                    }
                    subtaskElapsedRef.current[activeSubtaskId]++;
                    
                    // Force refresh for UI update occasionally if needed, but we trust ref for final calc
                }
            }, 1000);
        } else if (isFocusing && timeLeft === 0) {
            setIsFocusing(false);
            setIsReviewing(true); // Session End
            syncSubtaskTimes(); // Save time
        }
        return () => clearInterval(interval);
    }, [isFocusing, timeLeft, activeSubtaskId]);

    // Sync ref seconds to subtask state
    const syncSubtaskTimes = () => {
        const updatedSubtasks = subtasks.map(s => {
            const secondsAdded = subtaskElapsedRef.current[s.id] || 0;
            if (secondsAdded > 0) {
                const minsToAdd = Math.ceil(secondsAdded / 60); // Simple ceiling for now
                // Reset ref for this id so we don't double count if called multiple times
                subtaskElapsedRef.current[s.id] = 0; 
                return { 
                    ...s, 
                    actualMinutes: (s.actualMinutes || 0) + minsToAdd 
                };
            }
            return s;
        });
        setSubtasks(updatedSubtasks);
        return updatedSubtasks;
    };

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        const pad = (num: number) => num.toString().padStart(2, '0');
        if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
        return `${pad(m)}:${pad(s)}`;
    };

    const handleExtendSession = () => {
        // Find next incomplete subtask after current "focus"
        const firstIncompleteIdx = subtasks.findIndex(s => !s.isCompleted);
        const nextIncompleteIdx = subtasks.findIndex((s, i) => !s.isCompleted && i > firstIncompleteIdx);

        if (firstIncompleteIdx !== -1 && nextIncompleteIdx !== -1) {
// FIX: The component definition was incomplete. Completed the function logic and the component's JSX.
            const updatedSubtasks = subtasks.map((s, i) => {
                if (i === firstIncompleteIdx) {
                    return { ...s, isCompleted: true };
                }
                return s;
            });
            setSubtasks(updatedSubtasks);
            setActiveSubtaskId(subtasks[nextIncompleteIdx].id);
        } else {
            setIsFocusing(false);
            setIsReviewing(true);
        }
    };

    // Review Screen
    if (isReviewing) {
        return (
            <div className="p-4 bg-slate-900 border-t border-slate-700 animate-fade-in-fast">
                <h4 className="text-sm font-bold text-slate-300 mb-2">Session Complete!</h4>
                <p className="text-xs text-slate-400 mb-4">You focused for {Math.ceil(((task.plannedDurationMinutes * 60) - timeLeft) / 60)} minutes.</p>
                <div className="flex gap-2">
                    <button onClick={() => { const finalSubtasks = syncSubtaskTimes(); setIsReviewing(false); onSave({...task, subtasks: finalSubtasks}); }} className="flex-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 py-2 rounded-lg hover:bg-emerald-500/40">Save Progress</button>
                    <button onClick={handleExtendSession} className="flex-1 text-xs font-bold bg-indigo-500/20 text-indigo-300 py-2 rounded-lg hover:bg-indigo-500/40">Next Objective</button>
                </div>
            </div>
        )
    }

    // Focus Screen
    if (isFocusing) {
        const activeSubtask = subtasks.find(s => s.id === activeSubtaskId);
        const initialTime = (activeSubtask?.allocatedMinutes || duration) * 60;
        const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0;
        return (
            <div className="p-4 bg-slate-800/50 animate-fade-in-fast">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-xs text-indigo-400 font-bold">Focusing on:</p>
                        <p className="text-sm text-white font-medium">{activeSubtask?.title || 'Main Task'}</p>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white tracking-tighter">
                        {formatTime(timeLeft)}
                    </div>
                </div>
                 <div className="relative h-2 w-full bg-slate-700 rounded-full overflow-hidden mb-4">
                    <div className="absolute h-full bg-indigo-500" style={{width: `${progress}%`}}></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsFocusing(false)} className="flex-1 text-xs font-bold bg-slate-500/20 text-slate-300 py-2 rounded-lg hover:bg-slate-500/40">Pause</button>
                    <button onClick={() => { setIsFocusing(false); setIsReviewing(true); syncSubtaskTimes(); }} className="flex-1 text-xs font-bold bg-red-500/20 text-red-300 py-2 rounded-lg hover:bg-red-500/40">End Session</button>
                </div>
            </div>
        )
    }
    
    // Default Edit view
    return (
      <div className="p-4 space-y-4 bg-slate-900/50 rounded-2xl animate-fade-in-fast">
        <div>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Objective Title..."
            className="w-full bg-transparent text-white font-bold text-lg focus:outline-none"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as TaskCategory)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
          >
            {Object.values(TaskCategory).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value))}
            className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
          />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Subtasks</h4>
          <div className="space-y-2">
            {subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={sub.isCompleted} onChange={() => setSubtasks(subtasks.map(s => s.id === sub.id ? {...s, isCompleted: !s.isCompleted} : s))} />
                <span>{sub.title}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
          <div>
            {!isNew && onDelete && (
                <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-bold">Delete</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">Cancel</button>
            <button
                onClick={() => onSave({ ...task, title, description, plannedDurationMinutes: duration, category, subtasks })}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
                {isNew ? 'Create Task' : 'Save Changes'}
            </button>
            {!isNew && onStartFocus && (
                <button onClick={onStartFocus} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
                    Start Focus
                </button>
            )}
          </div>
        </div>
      </div>
    );
};


interface TaskItemProps {
    task: Task;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onStartFocus: () => void;
    onUpdate: (task: Task) => void;
    onDelete: () => void;
    onToggleBacklog: () => void;
    categoryColor: string;
    isBacklogItem?: boolean;
    backlogTasks?: Task[];
    onConsumeBacklogTask?: (id: string) => void;
    onMoveSubtasksToBank?: (subtasks: Subtask[], goalId?: string) => void;
    variant?: 'default' | 'blackboard';
}

const TaskItem: React.FC<TaskItemProps> = ({ 
    task, 
    isExpanded, 
    onToggleExpand, 
    onStartFocus, 
    onUpdate, 
    onDelete, 
    onToggleBacklog, 
    categoryColor,
    isBacklogItem,
    backlogTasks,
    onConsumeBacklogTask,
    onMoveSubtasksToBank,
    variant = 'default'
}) => {
    if (isExpanded) {
        return (
            <div className={`${variant === 'blackboard' ? 'bg-slate-900 border border-slate-700 rounded-2xl' : ''}`}>
                <ExpandedTaskCard 
                    task={task}
                    onSave={(updated, shouldClose = true) => {
                        onUpdate(updated);
                        if (shouldClose) onToggleExpand(); 
                    }}
                    onCancel={onToggleExpand}
                    onStartFocus={onStartFocus}
                    onDelete={onDelete}
                    backlogTasks={backlogTasks}
                    onConsumeBacklogTask={onConsumeBacklogTask}
                    onMoveSubtasksToBank={onMoveSubtasksToBank}
                />
            </div>
        );
    }

    const isBlackboard = variant === 'blackboard';

    const baseClasses = "group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden";
    const blackboardClasses = "bg-slate-900/80 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 shadow-md";
    const defaultClasses = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-500/30";
    const backlogClasses = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700";

    const containerClass = `${baseClasses} ${
        isBacklogItem ? backlogClasses : (isBlackboard ? blackboardClasses : defaultClasses)
    }`;

    return (
        <div 
            onClick={isBacklogItem ? undefined : onToggleExpand}
            className={containerClass}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${categoryColor}`}></div>

            <div className="mt-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBacklog(); }}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isBacklogItem 
                        ? 'border-slate-300 dark:border-slate-600 hover:bg-emerald-500 hover:border-emerald-500 text-transparent hover:text-white' 
                        : (isBlackboard 
                            ? 'border-slate-700 hover:bg-indigo-500 hover:border-indigo-500 text-transparent hover:text-white bg-slate-800'
                            : 'border-slate-300 dark:border-slate-600 hover:bg-indigo-500 hover:border-indigo-500 text-transparent hover:text-white')
                    }`}
                    title={isBacklogItem ? "Move to Active" : "Move to Bank"}
                >
                    {isBacklogItem ? (
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    )}
                </button>
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-bold ${isBlackboard ? 'text-white' : 'text-slate-800 dark:text-slate-100'} ${isBacklogItem ? 'text-sm' : 'text-lg'}`}>{task.title}</h4>
                    {task.plannedDurationMinutes > 0 && (
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            isBlackboard ? 'text-slate-400 bg-slate-800' : 'text-slate-400 bg-slate-100 dark:bg-slate-700'
                        }`}>
                            {task.plannedDurationMinutes}m
                        </span>
                    )}
                </div>
                
                {!isBacklogItem && (
                    <div className={`flex items-center gap-4 text-xs mt-2 ${isBlackboard ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {task.subtasks.length > 0 ? (
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                <span>{task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}</span>
                            </div>
                        ) : (
                             <span>No subtasks</span>
                        )}
                        <div className="flex items-center gap-1">
                             <div className={`w-2 h-2 rounded-full ${categoryColor}`}></div>
                             <span className="uppercase tracking-wider font-bold text-[10px]">{task.category}</span>
                        </div>
                    </div>
                )}
            </div>

             {!isBacklogItem && (
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onStartFocus(); }}
                        className="p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-110"
                        title="Start Focus Session"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
             )}
             
             {isBacklogItem && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
             )}
        </div>
    );
};

// Inline Task Editor Component (For Creating New Tasks)
const InlineTaskEditor: React.FC<{ 
    goalId: string; 
    onSave: (task: Partial<Task>) => void;
    onCancel: () => void;
    backlogTasks?: Task[];
    onConsumeBacklogTask?: (id: string) => void;
}> = ({ goalId, onSave, onCancel, backlogTasks, onConsumeBacklogTask }) => {
    return (
       <ExpandedTaskCard 
          task={{
            id: 'temp',
            title: '',
            category: TaskCategory.LEARNING,
            plannedDurationMinutes: 30,
            actualDurationMinutes: 0,
            status: TaskStatus.TODO,
            createdAt: Date.now(),
            subtasks: [],
            isBacklog: false
          } as Task}
          isNew={true}
          onSave={(updated) => onSave({...updated, linkedGoalId: goalId})}
          onCancel={onCancel}
          backlogTasks={backlogTasks}
          onConsumeBacklogTask={onConsumeBacklogTask}
       />
    )
};

const PaperView: React.FC<PaperViewProps> = ({ viewMode, goals, tasks, onTaskClick, onEditTask, onDeleteTask, onToggleBacklog, onAddTask, onOpenAddModal, onMoveSubtasksToBank }) => {
  
  // Filter relevant goals based on view
  const displayGoals = viewMode === 'all' 
    ? goals 
    : goals.filter(g => g.id === viewMode);

  // Helper to get category color dot
  const getCategoryColor = (cat: TaskCategory) => {
    switch (cat) {
        case TaskCategory.RESEARCH: return 'bg-orange-500 dark:bg-orange-400';
        case TaskCategory.CREATION: return 'bg-blue-500 dark:bg-blue-400';
        case TaskCategory.LEARNING: return 'bg-emerald-500 dark:bg-emerald-400';
        case TaskCategory.ACTIVITY: return 'bg-yellow-400 dark:bg-yellow-300';
        case TaskCategory.LEISURE: return 'bg-red-500 dark:bg-red-400';
        case TaskCategory.FILE_SORTING: return 'bg-gray-500 dark:bg-gray-400';
        case TaskCategory.DOCUMENTATION: return 'bg-cyan-500 dark:bg-cyan-400';
        default: return 'bg-slate-400';
    }
  };

  const getActiveTasksForGoal = (goalId: string) => {
    return tasks.filter(t => t.linkedGoalId === goalId && t.status !== TaskStatus.COMPLETED && !t.isBacklog);
  };

  const getBacklogTasksForGoal = (goalId: string) => {
    return tasks.filter(t => t.linkedGoalId === goalId && t.status !== TaskStatus.COMPLETED && t.isBacklog);
  };

  const getCompletedTasksForGoal = (goalId: string) => {
    return tasks.filter(t => t.linkedGoalId === goalId && t.status === TaskStatus.COMPLETED);
  };

  // Find tasks with no goals if in 'all' view
  const unlinkedTasks = viewMode === 'all' 
    ? tasks.filter(t => !t.linkedGoalId && t.status !== TaskStatus.COMPLETED)
    : [];

  // State for Bank Inputs (keyed by goalId)
  const [bankInputs, setBankInputs] = useState<{[key: string]: string}>({});
  
  // State to track loading status of categorization for a specific goal
  const [processingBankGoal, setProcessingBankGoal] = useState<string | null>(null);
  
  // State for Inline Creation (keyed by goalId)
  const [creatingForGoal, setCreatingForGoal] = useState<string | null>(null);

  // State for Expanded Active Task (Only one expanded at a time)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleBankInputChange = (goalId: string, value: string) => {
      setBankInputs(prev => ({...prev, [goalId]: value}));
  };

  const handleBankSubmit = async (goalId: string) => {
      const title = bankInputs[goalId];
      if (title && title.trim()) {
          setProcessingBankGoal(goalId);
          
          let category = TaskCategory.OTHER;
          try {
             // Auto-categorize before adding
             category = await categorizeTask(title);
          } catch(e) { 
              console.error("Categorization failed", e); 
          }

          onAddTask({
              title: title.trim(),
              category: category,
              plannedDurationMinutes: 30, // Default
              linkedGoalId: goalId,
              subtasks: [],
              isBacklog: true // Always add to backlog
          });
          setBankInputs(prev => ({...prev, [goalId]: ''}));
          setProcessingBankGoal(null);
      }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
      onAddTask(updatedTask); // Reuse onAddTask to update existing task
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 animate-fade-in">
        
      {viewMode === 'all' && (
        <div className="mb-8 p-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Today</h2>
            <p className="text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      )}

      {/* Inbox / Unlinked Tasks (Only in All view) */}
      {unlinkedTasks.length > 0 && (
        <section className="mb-10 px-4">
             <div className="flex items-center gap-3 mb-4 group cursor-default">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Inbox</h3>
            </div>
            <div className="space-y-3">
                {unlinkedTasks.map(task => (
                    <TaskItem 
                        key={task.id} 
                        task={task} 
                        isExpanded={expandedTaskId === task.id}
                        onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                        onStartFocus={() => onTaskClick(task)}
                        onUpdate={handleTaskUpdate}
                        onDelete={() => onDeleteTask(task.id)}
                        onToggleBacklog={() => onToggleBacklog(task)}
                        categoryColor={getCategoryColor(task.category)} 
                        onMoveSubtasksToBank={onMoveSubtasksToBank}
                    />
                ))}
            </div>
        </section>
      )}

      {/* Project Sections */}
      {displayGoals.map(goal => {
        const activeTasks = getActiveTasksForGoal(goal.id);
        const backlogTasks = getBacklogTasksForGoal(goal.id);
        const completedProjectTasks = getCompletedTasksForGoal(goal.id);
        const isCreating = creatingForGoal === goal.id;
        const isProcessing = processingBankGoal === goal.id;

        return (
          <section key={goal.id} className="group/section bg-white/5 dark:bg-slate-900/0 rounded-3xl p-2 md:p-6 transition-colors">
            {/* Header (Only show in 'all' view, otherwise header is in App.tsx) */}
            {viewMode === 'all' && (
                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur py-4 z-10 border-b border-transparent transition-colors px-2">
                    <div className="w-2 h-8 rounded-full bg-indigo-500"></div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {goal.title}
                    </h3>
                    <div className="ml-auto bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        {activeTasks.length} Active
                    </div>
                </div>
            )}
            
            {/* Active Tasks List - Black Box Theme */}
            <div className="mb-10 relative">
                {/* Blackboard Container */}
                <div className="bg-slate-950 rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-slate-800/50 relative overflow-hidden ring-1 ring-white/5">
                    {/* Subtle texture or gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-950/50 pointer-events-none"></div>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/60 relative z-10">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            Objectives / Job
                        </h4>
                        
                        <div className="flex items-center gap-3">
                            {/* Countdown Component */}
                            <GoalCountdown deadline={goal.deadline} />
                            
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                                {activeTasks.length} PENDING
                            </span>
                        </div>
                    </div>
                
                    <div className="space-y-4 relative z-10">
                        {activeTasks.length === 0 && !isCreating && (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                <div className="w-16 h-16 mb-4 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                                     <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </div>
                                <p className="text-sm font-medium text-slate-400">Board is clear</p>
                                <p className="text-xs text-slate-600 mt-1">Add an objective to start focus</p>
                            </div>
                        )}
                        
                        {activeTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                isExpanded={expandedTaskId === task.id}
                                onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                onStartFocus={() => onTaskClick(task)}
                                onUpdate={handleTaskUpdate}
                                onDelete={() => onDeleteTask(task.id)}
                                onToggleBacklog={() => onToggleBacklog(task)}
                                categoryColor={getCategoryColor(task.category)}
                                backlogTasks={backlogTasks}
                                onConsumeBacklogTask={onDeleteTask}
                                onMoveSubtasksToBank={onMoveSubtasksToBank}
                                variant="blackboard"
                            />
                        ))}
                        
                        {/* Inline Editor */}
                        {isCreating && (
                            <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl relative z-20">
                                <InlineTaskEditor 
                                    goalId={goal.id}
                                    onSave={(task) => {
                                        onAddTask(task);
                                        setCreatingForGoal(null);
                                    }}
                                    onCancel={() => setCreatingForGoal(null)}
                                    backlogTasks={backlogTasks}
                                    onConsumeBacklogTask={onDeleteTask}
                                />
                            </div>
                        )}
                    </div>
                </div>

                 {/* DIVIDER / ADD BUTTON */}
                {!isCreating && (
                    <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-center z-20">
                        <button
                            onClick={() => setCreatingForGoal(goal.id)}
                            className="flex items-center justify-center w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/50 hover:shadow-indigo-500/40 transition-all duration-300 transform hover:scale-110 active:scale-95 border-4 border-slate-50 dark:border-slate-950 group"
                            title="Add New Objective"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="h-4"></div> {/* Spacer for the add button overlap */}

            {/* Backlog / Memory Tasks Bank */}
            <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 mt-6">
                 <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Memory Tasks Bank</h4>
                    <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold px-2 py-1 rounded-md">{backlogTasks.length}</span>
                 </div>
                 <p className="text-xs text-slate-400 mb-4 ml-11">Individual tasks in relation to your objectives. Color coding is automatic.</p>
                
                {/* Apple Glass Input for Bank */}
                <div className="mb-6 relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-1 shadow-sm transition-shadow focus-within:shadow-md">
                        <div className="flex-1 px-4">
                            <input
                                type="text"
                                value={bankInputs[goal.id] || ''}
                                onChange={(e) => handleBankInputChange(goal.id, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleBankSubmit(goal.id)}
                                placeholder="Add task (auto-colored)..."
                                disabled={isProcessing}
                                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium py-3 disabled:opacity-50"
                            />
                        </div>
                        <button
                            onClick={() => handleBankSubmit(goal.id)}
                            disabled={isProcessing}
                            className="bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-400 rounded-xl p-2.5 shadow-sm transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isProcessing ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {backlogTasks.length === 0 && (
                         <p className="text-center text-slate-400 py-6 text-sm italic">Task bank is empty. Add ideas above.</p>
                    )}
                    {backlogTasks.map(task => (
                        <TaskItem 
                            key={task.id} 
                            task={task} 
                            isExpanded={false} // Backlog items don't expand in place, they have to be moved first
                            onToggleExpand={() => {}} 
                            onStartFocus={() => {}}
                            onUpdate={handleTaskUpdate}
                            onDelete={() => onDeleteTask(task.id)}
                            onToggleBacklog={() => onToggleBacklog(task)}
                            categoryColor={getCategoryColor(task.category)}
                            isBacklogItem={true}
                        />
                    ))}
                </div>
            </div>

            {/* Completed Tasks (Collapsed/Dimmed) */}
            {completedProjectTasks.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/60 px-2">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Completed History</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {completedProjectTasks.map(task => (
                                <div key={task.id} className="group/item flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-5 h-5 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 shrink-0">
                                            <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-slate-500 line-through text-sm decoration-slate-400 dark:decoration-slate-600 truncate">{task.title}</span>
                                            {/* Show top subtasks if relevant */}
                                            {task.subtasks.some(s => (s.actualMinutes || 0) > 0) && (
                                                <span className="text-[10px] text-slate-400">
                                                    Most Time: {task.subtasks.reduce((max, s) => (s.actualMinutes || 0) > (max.actualMinutes || 0) ? s : max, task.subtasks[0]).title}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 shrink-0">{task.actualDurationMinutes}m</span>
                                </div>
                            ))}
                        </div>
                    </div>
            )}
          </section>
        );
      })}
      
      {displayGoals.length === 0 && viewMode !== 'all' && (
          <div className="text-center text-slate-500 mt-20">Project not found.</div>
      )}
    </div>
  );
};

// Component for Countdown
const GoalCountdown: React.FC<{ deadline: string }> = ({ deadline }) => {
    const [timeLeft, setTimeLeft] = useState<{d: number, h: number, m: number} | null>(null);

    useEffect(() => {
        const calculate = () => {
            const now = new Date().getTime();
            const target = new Date(deadline).getTime();
            const diff = target - now;
            
            if (diff <= 0) return null;
            
            return {
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            };
        };
        
        setTimeLeft(calculate());
        const timer = setInterval(() => setTimeLeft(calculate()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, [deadline]);

    // Format date: "Oct 24"
    const dateObj = new Date(deadline);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    if (!timeLeft) {
        return (
             <div className="flex items-center gap-2 bg-red-900/20 px-3 py-1.5 rounded-full border border-red-900/30">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Due {dateStr}</span>
                <span className="text-xs font-bold text-red-500">Expired</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">{dateStr}</span>
            <div className="flex items-center gap-1 text-xs font-mono">
                <span className="text-indigo-400 font-bold">{timeLeft.d}d</span>
                <span className="text-slate-600">:</span>
                <span className="text-slate-300 font-bold">{timeLeft.h}h</span>
                <span className="text-slate-600">:</span>
                <span className="text-slate-300 font-bold">{timeLeft.m}m</span>
            </div>
        </div>
    );
};

export default PaperView;

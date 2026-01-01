import React, { useState, useRef, useEffect } from 'react';
import { Task, Goal, TaskStatus, TaskCategory, Subtask } from '../types';

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

const PaperView: React.FC<PaperViewProps> = ({ viewMode, goals, tasks, onTaskClick, onEditTask, onDeleteTask, onToggleBacklog, onAddTask, onOpenAddModal, onMoveSubtasksToBank }) => {
  
  // Filter relevant goals based on view
  const displayGoals = viewMode === 'all' 
    ? goals 
    : goals.filter(g => g.id === viewMode);

  // Helper to get category color dot
  const getCategoryColor = (cat: TaskCategory) => {
    switch (cat) {
        case TaskCategory.RESEARCH: return 'bg-blue-500 dark:bg-blue-400';
        case TaskCategory.CREATION: return 'bg-red-500 dark:bg-red-400';
        case TaskCategory.LEARNING: return 'bg-emerald-500 dark:bg-emerald-400';
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
  
  // State for Inline Creation (keyed by goalId)
  const [creatingForGoal, setCreatingForGoal] = useState<string | null>(null);

  // State for Expanded Active Task (Only one expanded at a time)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleBankInputChange = (goalId: string, value: string) => {
      setBankInputs(prev => ({...prev, [goalId]: value}));
  };

  const handleBankSubmit = (goalId: string) => {
      const title = bankInputs[goalId];
      if (title && title.trim()) {
          onAddTask({
              title: title.trim(),
              category: TaskCategory.OTHER,
              plannedDurationMinutes: 30, // Default
              linkedGoalId: goalId,
              subtasks: [],
              isBacklog: true // Always add to backlog
          });
          setBankInputs(prev => ({...prev, [goalId]: ''}));
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
            
            {/* Active Tasks List */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Active Objectives</h4>
                </div>
                
                <div className="space-y-3">
                    {activeTasks.length === 0 && !isCreating && (
                        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-sm">
                            <p>No active objectives. Pull from backlog or create new.</p>
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
                        />
                    ))}
                    
                    {/* Inline Editor Appended Here */}
                    {isCreating && (
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
                    )}
                </div>
            </div>

            {/* DIVIDER / ADD BUTTON */}
            {!isCreating && (
                <div className="flex items-center justify-center py-4 relative group/add">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-200 dark:border-slate-800 opacity-30"></div>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setCreatingForGoal(goal.id)}
                            className="flex items-center justify-center text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 transform hover:scale-125 hover:rotate-90 z-10"
                            title="Add New Objective"
                        >
                            <svg className="w-8 h-8 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Backlog / Memory Tasks Bank */}
            <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 mt-6">
                 <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Memory Tasks Bank</h4>
                    <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold px-2 py-1 rounded-md">{backlogTasks.length}</span>
                 </div>
                 <p className="text-xs text-slate-400 mb-4 ml-11">Individual tasks in relation to your objectives</p>
                
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
                                placeholder="Add multiple tasks here..."
                                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium py-3"
                            />
                        </div>
                        <button
                            onClick={() => handleBankSubmit(goal.id)}
                            className="bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-400 rounded-xl p-2.5 shadow-sm transition-all transform hover:scale-105"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
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
    onMoveSubtasksToBank
}) => {
    if (isExpanded) {
        return (
            <ExpandedTaskCard 
                task={task}
                onSave={(updated) => {
                    onUpdate(updated);
                    onToggleExpand(); 
                }}
                onCancel={onToggleExpand}
                onStartFocus={onStartFocus}
                onDelete={onDelete}
                backlogTasks={backlogTasks}
                onConsumeBacklogTask={onConsumeBacklogTask}
                onMoveSubtasksToBank={onMoveSubtasksToBank}
            />
        );
    }

    return (
        <div 
            onClick={isBacklogItem ? undefined : onToggleExpand}
            className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isBacklogItem 
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-500/30'
            }`}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${categoryColor}`}></div>

            <div className="mt-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBacklog(); }}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isBacklogItem 
                        ? 'border-slate-300 dark:border-slate-600 hover:bg-emerald-500 hover:border-emerald-500 text-transparent hover:text-white' 
                        : 'border-slate-300 dark:border-slate-600 hover:bg-indigo-500 hover:border-indigo-500 text-transparent hover:text-white'
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
                    <h4 className={`font-bold text-slate-800 dark:text-slate-100 ${isBacklogItem ? 'text-sm' : 'text-lg'}`}>{task.title}</h4>
                    {task.plannedDurationMinutes > 0 && (
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {task.plannedDurationMinutes}m
                        </span>
                    )}
                </div>
                
                {!isBacklogItem && (
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
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

interface ExpandedTaskCardProps {
    task: Task;
    isNew?: boolean;
    onSave: (task: Task) => void;
    onCancel: () => void;
    onStartFocus?: () => void;
    onDelete?: () => void;
    backlogTasks?: Task[];
    onConsumeBacklogTask?: (id: string) => void;
    onMoveSubtasksToBank?: (subtasks: Subtask[], goalId?: string) => void;
}

const ExpandedTaskCard: React.FC<ExpandedTaskCardProps> = ({ task, isNew, onSave, onCancel, onStartFocus, onDelete, backlogTasks, onConsumeBacklogTask, onMoveSubtasksToBank }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [duration, setDuration] = useState(task.plannedDurationMinutes);
    const [category, setCategory] = useState(task.category);
    const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
    const [newSubtask, setNewSubtask] = useState('');
    const [newSubtaskCategory, setNewSubtaskCategory] = useState<TaskCategory>(task.category);
    
    // Focus Mode State
    const [isFocusing, setIsFocusing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(task.plannedDurationMinutes * 60);
    const [isReviewing, setIsReviewing] = useState(false);
    
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
    }, [isFocusing]);

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
                    
                    // Periodically update visible state (every 10s or just rely on ref for final save?)
                    // To show live updates, we need state. Let's update state every second for the active one only?
                    // Optimization: Only update React state every 60s or on stop? 
                    // Let's stick to simple state update for now unless performance hit.
                    setSubtasks(prev => prev.map(s => {
                        if (s.id === activeSubtaskId) {
                            // Only increment internal minute counter if seconds cross 60
                            // Easier: Use decimal minutes for accuracy or just seconds. The type is number.
                            // Let's keep seconds in ref, and just force a re-render for UI if needed.
                            // Actually, let's just increment a local 'tick' state to force render if we want to show seconds?
                            // For simplicity, let's just assume we update the `subtasks` actualMinutes on STOP.
                            // But user wants to see "recorded data".
                            return s; 
                        }
                        return s;
                    }));
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
        // Find next incomplete subtask after current "focus" (assuming order matters?)
        // Let's modify the subtask allocations directly.
        const firstIncompleteIdx = subtasks.findIndex(s => !s.isCompleted);
        const nextIncompleteIdx = subtasks.findIndex((s, i) => !s.isCompleted && i > firstIncompleteIdx);

        if (firstIncompleteIdx !== -1 && nextIncompleteIdx !== -1) {
            const updatedSubtasks = [...subtasks];
            const current = updatedSubtasks[firstIncompleteIdx];
            const next = updatedSubtasks[nextIncompleteIdx];

            // Add 5 min to current
            current.allocatedMinutes = (current.allocatedMinutes || 0) + 5;
            // Remove 5 min from next (floor at 0)
            if ((next.allocatedMinutes || 0) >= 5) {
                next.allocatedMinutes = (next.allocatedMinutes || 0) - 5;
            } else {
                 next.allocatedMinutes = 0; 
            }
            setSubtasks(updatedSubtasks);
        } else {
             // Just extend total time
             setTimeLeft(prev => prev + 300); // Add 5 mins
        }
    };

    const handleStopSession = () => {
        syncSubtaskTimes();
        setIsFocusing(false);
        setIsReviewing(true);
    };

    const handleMoveRemainingToBank = () => {
        const currentSubtasks = syncSubtaskTimes(); // Ensure we have latest times
        const remaining = currentSubtasks.filter(s => !s.isCompleted);
        
        if (onMoveSubtasksToBank && task.linkedGoalId) {
            onMoveSubtasksToBank(remaining, task.linkedGoalId);
        }
        
        const keptSubtasks = currentSubtasks.filter(s => s.isCompleted);
        
        // Calculate total actual duration based on subtasks
        const totalActual = currentSubtasks.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

        onSave({
            ...task,
            subtasks: keptSubtasks,
            actualDurationMinutes: (task.actualDurationMinutes || 0) + totalActual,
            status: keptSubtasks.length > 0 ? TaskStatus.COMPLETED : TaskStatus.TODO 
        });
        onCancel();
    };

    const handleSave = () => {
        if (!title.trim()) return;
        
        // Ensure we save any pending time if we were just focusing
        let finalSubtasks = [...subtasks];
        
        // Auto-save pending subtask input
        if (newSubtask.trim()) {
            finalSubtasks.push({ 
                id: Date.now().toString() + Math.random(), 
                title: newSubtask.trim(), 
                isCompleted: false,
                category: newSubtaskCategory 
            });
        }

        onSave({
            ...task,
            title,
            description,
            plannedDurationMinutes: duration,
            category,
            subtasks: finalSubtasks
        });
        if (isNew) onCancel(); 
    };

    // Auto-save on blur for existing tasks to feel "live"
    const handleBlur = () => {
        if (!isNew && title.trim()) {
            handleSave();
        }
    };

    const addSubtask = () => {
        if (newSubtask.trim()) {
            const newSt: Subtask = { 
                id: Date.now().toString(), 
                title: newSubtask, 
                isCompleted: false,
                category: newSubtaskCategory,
                allocatedMinutes: 0 // Default 0, user sets it
            };
            const updated = [...subtasks, newSt];
            setSubtasks(updated);
            setNewSubtask('');
            if (!isNew) onSave({ ...task, subtasks: updated });
        }
    };

    const toggleSubtask = (id: string) => {
        const updated = subtasks.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s);
        setSubtasks(updated);
        if (!isNew) onSave({ ...task, subtasks: updated });
    };

    const removeSubtask = (id: string) => {
        const updated = subtasks.filter(s => s.id !== id);
        setSubtasks(updated);
        if (!isNew) onSave({ ...task, subtasks: updated });
    };
    
    const updateSubtaskAllocation = (id: string, minutes: number) => {
        const updated = subtasks.map(s => s.id === id ? { ...s, allocatedMinutes: minutes } : s);
        setSubtasks(updated);
        const total = updated.reduce((acc, curr) => acc + (curr.allocatedMinutes || 0), 0);
        if (total > 0) setDuration(total);
        if (!isNew) onSave({ ...task, subtasks: updated, plannedDurationMinutes: total > 0 ? total : duration });
    };

    const handlePullFromBacklog = (bTask: Task) => {
        const newSt: Subtask = { 
            id: Date.now().toString(), 
            title: bTask.title, 
            isCompleted: false,
            category: bTask.category,
            allocatedMinutes: 30 
        };
        const updated = [...subtasks, newSt];
        setSubtasks(updated);
        if (!isNew) onSave({ ...task, subtasks: updated });
        if (onConsumeBacklogTask) {
            onConsumeBacklogTask(bTask.id);
        }
    };

    // ... (Helper functions getTagColorStyles, getRowColorStyles, getCategoryColor remain same)
    const getTagColorStyles = (cat?: TaskCategory) => {
        const targetCat = cat || TaskCategory.OTHER;
        switch (targetCat) {
            case TaskCategory.RESEARCH: 
                return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40';
            case TaskCategory.LEARNING: 
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/40';
            case TaskCategory.CREATION: 
                return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/40';
            default: 
                return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700';
        }
    };

    const getRowColorStyles = (cat?: TaskCategory) => {
        const targetCat = cat || TaskCategory.OTHER;
        switch (targetCat) {
            case TaskCategory.RESEARCH: 
                return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
            case TaskCategory.LEARNING: 
                return 'border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10';
            case TaskCategory.CREATION: 
                return 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
            default: 
                return 'border-l-4 border-l-slate-300 dark:border-l-slate-600 bg-slate-50 dark:bg-slate-900';
        }
    };

    const getCategoryColor = (cat: TaskCategory) => {
      switch (cat) {
          case TaskCategory.RESEARCH: return 'bg-blue-500';
          case TaskCategory.CREATION: return 'bg-red-500';
          case TaskCategory.LEARNING: return 'bg-emerald-500';
          default: return 'bg-slate-400';
      }
    };

    // --- FOCUS MODE RENDER ---
    if (isFocusing || isReviewing) {
        return (
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative min-h-[400px] flex flex-col p-6 border border-slate-700">
                {isReviewing ? (
                    <div className="flex flex-col h-full items-center justify-center space-y-6 text-center">
                        <h2 className="text-3xl font-bold text-white">Session Complete</h2>
                        <p className="text-slate-400">Time is up! Here is your time breakdown:</p>
                        
                        <div className="w-full max-w-sm bg-slate-800 rounded-xl p-4 text-left space-y-2 max-h-48 overflow-y-auto">
                             {subtasks.map(s => (
                                <div key={s.id} className="flex justify-between items-center text-sm border-b border-slate-700 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getCategoryColor(s.category || TaskCategory.OTHER)}`}></div>
                                        <span className={s.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}>{s.title}</span>
                                    </div>
                                    <span className="font-mono text-emerald-400">{s.actualMinutes || 0}m <span className="text-slate-600">/ {s.allocatedMinutes}m</span></span>
                                </div>
                             ))}
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-sm">
                             {subtasks.filter(s => !s.isCompleted).length > 0 && (
                                <button 
                                    onClick={handleMoveRemainingToBank}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all"
                                >
                                    Move Remaining to Memory Bank
                                </button>
                             )}
                             <button 
                                onClick={() => { onCancel(); onSave({...task, status: TaskStatus.COMPLETED}); }}
                                className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all"
                            >
                                Close & Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-1">Current Focus</h3>
                                <h2 className="text-2xl font-bold truncate max-w-md">{task.title}</h2>
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-mono font-bold tracking-tighter text-indigo-400">
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="text-xs text-slate-500 uppercase font-bold mt-1">Total Remaining</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-6 pr-2">
                             {subtasks.map((sub, index) => {
                                 // Active logic: Is it the selected one?
                                 const isActive = activeSubtaskId === sub.id;
                                 const secondsElapsed = subtaskElapsedRef.current[sub.id] || 0;
                                 const currentLiveMinutes = (sub.actualMinutes || 0) + Math.floor(secondsElapsed / 60);

                                 return (
                                     <div 
                                        key={sub.id} 
                                        onClick={() => !sub.isCompleted && setActiveSubtaskId(sub.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-indigo-900/30 border-indigo-500/50 shadow-lg shadow-indigo-900/20 scale-[1.02]' : 'bg-slate-800/50 border-slate-700 opacity-70 hover:opacity-100'}`}
                                     >
                                         <div className="flex items-center gap-4">
                                             <div 
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-indigo-400 text-indigo-400' : 'border-slate-500 text-transparent'}`}
                                             >
                                                 {isActive && <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse"></div>}
                                             </div>
                                             <div>
                                                 <p className={`font-medium text-lg ${sub.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>{sub.title}</p>
                                                 <div className="flex items-center gap-2 mt-1">
                                                     <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                         <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`}
                                                            style={{ width: `${Math.min(100, ((currentLiveMinutes) / (sub.allocatedMinutes || 1)) * 100)}%` }}
                                                         ></div>
                                                     </div>
                                                     <p className="text-xs text-slate-400 font-mono">
                                                         {currentLiveMinutes}m / {sub.allocatedMinutes || 0}m
                                                     </p>
                                                 </div>
                                             </div>
                                         </div>
                                         {isActive ? (
                                             <div className="text-xs bg-indigo-500 text-white px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
                                                 Recording
                                             </div>
                                         ) : (
                                             sub.isCompleted && <span className="text-emerald-500 font-bold text-xs">DONE</span>
                                         )}
                                     </div>
                                 );
                             })}
                             {subtasks.length === 0 && <p className="text-center text-slate-500 italic">No specific objectives defined.</p>}
                        </div>

                        <div className="flex gap-4 mt-auto">
                            <button 
                                onClick={handleExtendSession}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group"
                                title="Add 5m to current, steal from next"
                            >
                                <span>Extend +5m</span>
                                <span className="text-xs font-normal text-slate-400 group-hover:text-white">(Reallocates)</span>
                            </button>
                            <button 
                                onClick={handleStopSession}
                                className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl font-bold transition-all"
                            >
                                Finish Early
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // --- DEFAULT EDIT VIEW ---
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-500/50 shadow-xl overflow-hidden transition-all relative ${isNew ? 'animate-expand' : 'animate-fade-in-up'}`}>
            <div className="p-6 space-y-5">
                {/* Header: Title & Category */}
                <div className="flex items-start gap-4">
                     <button 
                        onClick={() => {
                            const cats = Object.values(TaskCategory);
                            const next = cats[(cats.indexOf(category) + 1) % cats.length];
                            setCategory(next);
                            setNewSubtaskCategory(next); // Sync subtask input color too
                            if(!isNew) onSave({...task, category: next});
                        }}
                        className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 border-indigo-500 flex items-center justify-center transition-colors`}
                    >
                        <div className={`w-3 h-3 rounded-full bg-indigo-500`}></div>
                    </button>
                    <div className="flex-1">
                        <input 
                            ref={titleRef}
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleBlur}
                            placeholder="Active Session / Task Title"
                            className="w-full bg-transparent text-xl font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                        />
                        <input 
                            type="text" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleBlur}
                            placeholder="Add notes..."
                            className="w-full bg-transparent text-sm text-slate-500 dark:text-slate-400 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none mt-1"
                        />
                    </div>
                    {/* Category Badge */}
                    <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                        {category}
                    </div>
                </div>

                {/* Checklist Section */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-3">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Objectives / Checklist</h4>
                         <span className="text-[10px] text-slate-400 font-mono">Total: {duration}m</span>
                    </div>
                   
                    <div className="space-y-2 mb-4">
                        {subtasks.length === 0 && (
                             <p className="text-xs text-slate-400 italic mb-2">No objectives yet. Add manually or pull from task bank.</p>
                        )}
                        {subtasks.map(sub => (
                            <div key={sub.id} className={`flex items-center gap-3 group/sub p-2 rounded-md transition-all ${getRowColorStyles(sub.category)}`}>
                                <input 
                                    type="checkbox" 
                                    checked={sub.isCompleted} 
                                    onChange={() => toggleSubtask(sub.id)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer ml-1"
                                />
                                <div className="flex-1">
                                    <span className={`block text-sm font-medium ${sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {sub.title}
                                    </span>
                                    {/* Stats Display */}
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="h-1 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500" 
                                                style={{ width: `${Math.min(100, ((sub.actualMinutes || 0) / (sub.allocatedMinutes || 1)) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-mono">
                                            {sub.actualMinutes || 0}m / {sub.allocatedMinutes}m
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Time Allocation Input */}
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                    <input
                                        type="number"
                                        min="0"
                                        value={sub.allocatedMinutes || ''}
                                        onChange={(e) => updateSubtaskAllocation(sub.id, parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-8 text-center bg-transparent text-xs font-mono focus:outline-none text-slate-600 dark:text-slate-300"
                                    />
                                    <span className="text-[10px] text-slate-400">m</span>
                                </div>

                                <button onClick={() => removeSubtask(sub.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-opacity px-2">
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    {/* Manual Add Input */}
                    <div className="flex gap-2 mb-4 items-center bg-white dark:bg-slate-800 p-1 pr-2 rounded-lg border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/20">
                         <div className="relative group">
                            <select
                                value={newSubtaskCategory}
                                onChange={(e) => setNewSubtaskCategory(e.target.value as TaskCategory)}
                                className="appearance-none bg-transparent text-[10px] font-bold uppercase text-slate-500 focus:outline-none cursor-pointer pl-4 pr-6 h-full"
                            >
                                {Object.values(TaskCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat.substring(0, 3)}</option>
                                ))}
                            </select>
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                                <div className={`w-2 h-2 rounded-full ${getCategoryColor(newSubtaskCategory)}`}></div>
                            </div>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <input 
                            type="text"
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                            placeholder="Add objective..."
                            className="flex-1 bg-transparent text-sm focus:outline-none py-1.5 text-slate-700 dark:text-slate-300 placeholder-slate-400"
                        />
                        <button 
                            onClick={addSubtask}
                            className="text-indigo-600 hover:bg-indigo-50 rounded p-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>

                    {/* Task Bank Selection */}
                    {backlogTasks && backlogTasks.length > 0 && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Link from Memory Tasks Bank
                            </h5>
                            <div className="flex flex-wrap gap-2">
                                {backlogTasks.map(bTask => (
                                    <button
                                        key={bTask.id}
                                        onClick={() => handlePullFromBacklog(bTask)}
                                        className={`px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-bold uppercase tracking-wide transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1 ${getTagColorStyles(bTask.category)}`}
                                        title={`Add "${bTask.title}" to checklist`}
                                    >
                                        <span className="text-lg leading-none">+</span> {bTask.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                        <span className="text-xs font-bold text-slate-500 uppercase">Est. Total</span>
                        <input 
                            type="number"
                            value={duration}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setDuration(val);
                                if(!isNew) onSave({...task, plannedDurationMinutes: val});
                            }}
                            className="w-10 bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none text-right"
                        />
                        <span className="text-xs text-slate-500">min</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isNew && (
                            <button 
                                onClick={onDelete}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                         <button 
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                            {isNew ? 'Cancel' : 'Close'}
                        </button>
                        
                        {isNew ? (
                            <button 
                                onClick={handleSave}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                            >
                                Create Objective
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setTimeLeft(duration * 60); setIsFocusing(true); }}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Start Focus
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaperView;
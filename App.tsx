import React, { useState, useEffect, useRef } from 'react';
import TimerModal from './components/TimerModal';
import GoalCard from './components/GoalCard';
import AnalysisPanel from './components/AnalysisPanel';
import ProgressChart from './components/ProgressChart';
import Sidebar from './components/Sidebar';
// FIX: The error indicated no default export. Changed to a named import, assuming PaperView is exported as a named component. This should be 'import PaperView from ...' if the export is default.
import PaperView from './components/PaperView';
import AddTaskModal from './components/AddTaskModal';
import CreateProjectModal from './components/CreateProjectModal';
import TimesheetView from './components/TimesheetView';
import { Task, Goal, GoalType, TaskStatus, TaskCategory, Subtask, TimeOfDay } from './types';

// Initial Mock Data
const INITIAL_GOALS: Goal[] = [
  {
    id: '1',
    title: 'Ajbowler consult internship',
    type: GoalType.MONTHLY,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    targetHours: 40,
    loggedHours: 12,
    description: 'Internship requirements and learning',
    dailyTarget: 1.5,
    preferredTime: TimeOfDay.MORNING
  },
  {
    id: '2',
    title: 'Wingmentor',
    type: GoalType.FORECAST,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    targetHours: 100,
    loggedHours: 45,
    description: 'Pilot training program',
    dailyTarget: 2,
    preferredTime: TimeOfDay.EVENING
  }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Learn more about quantity surveying',
    category: TaskCategory.LEARNING,
    plannedDurationMinutes: 120,
    actualDurationMinutes: 0,
    status: TaskStatus.TODO,
    linkedGoalId: '1',
    createdAt: Date.now(),
    description: 'Read first 3 chapters of the QS handbook.',
    tags: ['study', 'reading'],
    subtasks: [
        {id: 's1', title: 'Chapter 1: Intro', isCompleted: false, category: TaskCategory.LEARNING, allocatedMinutes: 45},
        {id: 's2', title: 'Chapter 2: Methods', isCompleted: false, category: TaskCategory.RESEARCH, allocatedMinutes: 45}
    ],
    isBacklog: false
  },
  {
    id: 't2',
    title: 'Ajbc mindmap app',
    category: TaskCategory.CREATION,
    plannedDurationMinutes: 120,
    actualDurationMinutes: 0,
    status: TaskStatus.TODO,
    linkedGoalId: '1',
    createdAt: Date.now(),
    subtasks: [],
    isBacklog: false
  },
  {
    id: 't3',
    title: 'Wing mentor app',
    category: TaskCategory.CREATION,
    plannedDurationMinutes: 120,
    actualDurationMinutes: 0,
    status: TaskStatus.TODO,
    linkedGoalId: '2',
    createdAt: Date.now(),
    subtasks: [],
    isBacklog: true
  },
    {
    id: 't4',
    title: 'Flight hours and examination IFR and ME',
    category: TaskCategory.LEARNING,
    plannedDurationMinutes: 120,
    actualDurationMinutes: 0,
    status: TaskStatus.TODO,
    linkedGoalId: '2',
    createdAt: Date.now(),
    subtasks: [],
    isBacklog: false
  }
];

// Helper to get consistent images for projects
const getProjectImage = (goalId: string, title: string) => {
    // Hardcoded for the demo goals
    if (goalId === '1' || title.toLowerCase().includes('consult') || title.toLowerCase().includes('internship')) {
        return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800'; // Office/Work
    }
    if (goalId === '2' || title.toLowerCase().includes('wing') || title.toLowerCase().includes('pilot') || title.toLowerCase().includes('flight')) {
        return 'https://images.unsplash.com/photo-1478812954026-9c750f0e89fc?auto=format&fit=crop&q=80&w=800'; // Aviation/Nature
    }

    // Fallback pool for new projects
    const images = [
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800', // Skyscraper
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800', // Meeting
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800', // Tech
        'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=800', // Plan
    ];
    
    // Deterministic selection based on ID char code sum
    const sum = goalId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return images[sum % images.length];
};

type AppState = 'loading' | 'landing' | 'project-selection' | 'project-detail' | 'app';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  
  const [tasks, setTasks] = useState<Task[]>(() => {
      const saved = localStorage.getItem('focusflow_tasks');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  const [goals, setGoals] = useState<Goal[]>(() => {
      const saved = localStorage.getItem('focusflow_goals');
      return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });
  
  const [currentView, setCurrentView] = useState('all'); // 'all', 'dashboard', 'timesheet' or goalId
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : false; // Default to light mode (false)
    }
    return false;
  });

  // Edit/Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Scroll State for Notch Effect
  const [scrollTop, setScrollTop] = useState(0);

  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
        setAppState('landing');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Persistence & Theme Effect
  useEffect(() => {
    localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('focusflow_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Reset scroll when changing views
  useEffect(() => {
      setScrollTop(0);
  }, [currentView, appState]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Handlers
  const handleEnterApp = (view: string) => {
      setCurrentView(view);
      // If entering a specific project from selection, go to detail view (no sidebar)
      // If entering dashboard, go to app view (with sidebar)
      if (view === 'dashboard' || view === 'all' || view === 'timesheet') {
          setAppState('app');
      } else {
          setAppState('project-detail');
      }
  };

  const handleTaskClick = (task: Task) => {
    if (task.status !== TaskStatus.COMPLETED) {
        setActiveTask(task);
    }
  };

  const handleSessionComplete = (durationMinutes: number, isTaskDone: boolean, updatedSubtasks: Subtask[]) => {
    if (!activeTask) return;

    // Update the task
    setTasks(prev => prev.map(t => {
        if (t.id === activeTask.id) {
            return {
                ...t,
                status: isTaskDone ? TaskStatus.COMPLETED : TaskStatus.TODO,
                // Accumulate time spent regardless of completion
                actualDurationMinutes: (t.actualDurationMinutes || 0) + durationMinutes,
                subtasks: updatedSubtasks
            };
        }
        return t;
    }));

    // Update linked goal if exists
    if (activeTask.linkedGoalId) {
        setGoals(prev => prev.map(g => {
            if (g.id === activeTask.linkedGoalId) {
                return {
                    ...g,
                    loggedHours: parseFloat((g.loggedHours + (durationMinutes / 60)).toFixed(2))
                };
            }
            return g;
        }));
    }

    setActiveTask(null);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskData.id) {
        // Update existing
        setTasks(prev => prev.map(t => t.id === taskData.id ? { ...t, ...taskData } as Task : t));
    } else {
        // Create new
        const newTask: Task = {
            id: Date.now().toString(),
            title: taskData.title!,
            category: taskData.category!,
            plannedDurationMinutes: taskData.plannedDurationMinutes!,
            actualDurationMinutes: 0,
            status: TaskStatus.TODO,
            linkedGoalId: taskData.linkedGoalId,
            createdAt: Date.now(),
            description: taskData.description,
            tags: taskData.tags,
            subtasks: taskData.subtasks || [],
            isBacklog: taskData.isBacklog || false
        };
        setTasks(prev => [...prev, newTask]);
    }
  };

  const handleCreateProject = (projectData: any, taskBank: {title: string, category: TaskCategory}[]) => {
    const newGoalId = Date.now().toString();
    
    // 1. Create the Goal
    const newGoal: Goal = {
        id: newGoalId,
        title: projectData.title,
        type: projectData.type,
        deadline: projectData.deadline,
        targetHours: projectData.targetHours,
        loggedHours: 0,
        description: projectData.description,
        dailyTarget: projectData.dailyTarget,
        preferredTime: projectData.preferredTime,
    };
    setGoals(prev => [...prev, newGoal]);

    // 2. Create Tasks from Bank (as Backlog items)
    const newTasks: Task[] = taskBank.map((item, idx) => ({
        id: newGoalId + '_t_' + idx,
        title: item.title,
        category: item.category, // Use the selected category
        plannedDurationMinutes: 60, // Default
        actualDurationMinutes: 0,
        status: TaskStatus.TODO,
        linkedGoalId: newGoalId,
        createdAt: Date.now(),
        isBacklog: true,
        subtasks: []
    }));

    setTasks(prev => [...prev, ...newTasks]);
    
    // Switch view to new project
    setCurrentView(newGoalId);
    // Determine state based on where we came from
    if (appState === 'project-selection') {
        setAppState('project-detail');
    } else if (appState !== 'app') {
        setAppState('app');
    }
  };

  const handleToggleBacklog = (task: Task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isBacklog: !t.isBacklog } : t));
  };
  
  // Handler to move subtasks to the memory bank (backlog)
  const handleMoveSubtasksToBank = (subtasksToMove: Subtask[], goalId?: string) => {
      if (!subtasksToMove.length) return;

      const newBacklogTasks: Task[] = subtasksToMove.map(st => ({
          id: Date.now() + Math.random().toString(),
          title: st.title,
          category: st.category || TaskCategory.OTHER,
          plannedDurationMinutes: st.allocatedMinutes || 30, // Preserve allocated time if set, else default
          actualDurationMinutes: 0,
          status: TaskStatus.TODO,
          linkedGoalId: goalId,
          createdAt: Date.now(),
          isBacklog: true,
          subtasks: []
      }));

      setTasks(prev => [...prev, ...newBacklogTasks]);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // --- IMPORT / EXPORT LOGIC ---
  
  const handleExportProjectJSON = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectTasks = tasks.filter(t => t.linkedGoalId === goalId);
    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        goal: goal,
        tasks: projectTasks
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize title for filename
    const filename = goal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `timeout_project_${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportProjectCSV = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const projectTasks = tasks.filter(t => t.linkedGoalId === goalId);
    
    // CSV Header
    const headers = ['Date', 'Task Title', 'Category', 'Duration (min)', 'Status', 'Notes'];
    
    // CSV Rows
    const rows = projectTasks.map(t => {
        const date = new Date(t.createdAt).toLocaleDateString();
        // Escape quotes in strings
        const title = `"${t.title.replace(/"/g, '""')}"`; 
        const notes = t.description ? `"${t.description.replace(/"/g, '""')}"` : '""';
        return [
            date,
            title,
            t.category,
            t.actualDurationMinutes || 0,
            t.status,
            notes
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = goal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `timesheet_${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            
            // Basic validation
            if (!data.goal || !data.tasks || !Array.isArray(data.tasks)) {
                alert("Invalid Time Out project file.");
                return;
            }

            const importedGoal: Goal = data.goal;
            const importedTasks: Task[] = data.tasks;

            // Update Goals: Remove existing with same ID, append new
            setGoals(prev => {
                const filtered = prev.filter(g => g.id !== importedGoal.id);
                return [...filtered, importedGoal];
            });

            // Update Tasks: Remove existing linked to this goal, append new
            setTasks(prev => {
                const existingTaskIds = importedTasks.map(t => t.id);
                // Remove tasks that might collide or are part of the old version of this goal
                const filtered = prev.filter(t => 
                    t.linkedGoalId !== importedGoal.id && !existingTaskIds.includes(t.id)
                );
                return [...filtered, ...importedTasks];
            });

            alert(`Project "${importedGoal.title}" imported successfully.`);
            
            // Navigate to imported project
            if (appState === 'project-detail') {
                 // Refresh view if we are already in detail view but loaded different data
                 // setCurrentView(importedGoal.id); (already likely set, but ensures update)
            } else {
                 setCurrentView(importedGoal.id);
                 setAppState('project-detail');
            }

        } catch (error) {
            console.error("Import error", error);
            alert("Failed to parse project file.");
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Calculate pending tasks with progress (Buildup)
  const tasksInProgress = tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.actualDurationMinutes > 0);

  if (appState === 'loading') {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                <img 
                    src="https://lh3.googleusercontent.com/d/1bHJPW95-8OOP_AFWVJboqNIFFCvru2e2" 
                    alt="Loading..." 
                    className="relative w-48 h-48 md:w-64 md:h-64 object-contain animate-bounce-slow drop-shadow-2xl" 
                />
            </div>
            <h1 className="mt-8 text-3xl font-bold text-slate-800 dark:text-white tracking-tight animate-fade-in">Time Out</h1>
            <div className="mt-4 flex items-center gap-2">
                <span className="text-slate-400 font-medium tracking-widest text-xs uppercase">Loading</span>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    );
  }
  
  if (appState === 'landing') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in transition-colors duration-500">
            
            {/* Header / Logo Section - Larger Logo, Small Text */}
            <div className="flex flex-col items-center justify-center mb-10 text-center animate-fade-in-down">
                <img 
                    src="https://lh3.googleusercontent.com/d/1bHJPW95-8OOP_AFWVJboqNIFFCvru2e2" 
                    alt="Time Out Logo" 
                    className="w-40 h-40 object-contain mb-6 drop-shadow-2xl" 
                />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">Time Out</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest max-w-md">
                    Your co-pilot in tracking your progress within projects & objectives
                </p>
            </div>

            {/* Options Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
                
                {/* Option 1: Enter Platform */}
                <div className="flex flex-col group w-full animate-fade-in-up [animation-delay:100ms] cursor-pointer" onClick={() => handleEnterApp('dashboard')}>
                    <div 
                        className="relative h-[480px] w-full overflow-hidden rounded-[2.5rem] shadow-xl group-hover:shadow-2xl group-hover:shadow-indigo-500/20 transition-all duration-500 ease-out transform group-hover:-translate-y-2"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=800" 
                            alt="Dashboard" 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Gradient Overlay: Fades to black at bottom */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                        
                        {/* Title inside card */}
                        <div className="absolute bottom-0 left-0 p-8 w-full text-left">
                            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight group-hover:text-indigo-200 transition-colors">Platform</h3>
                        </div>
                    </div>
                    {/* Description - Reveals on Hover */}
                    <div className="h-10 mt-4 px-2">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                            Access your full dashboard, analytics, and daily tasks overview.
                        </p>
                    </div>
                </div>

                {/* Option 2: Select Project */}
                <div className="flex flex-col group w-full animate-fade-in-up [animation-delay:200ms] cursor-pointer" onClick={() => setAppState('project-selection')}>
                    <div 
                        className="relative h-[480px] w-full overflow-hidden rounded-[2.5rem] shadow-xl group-hover:shadow-2xl group-hover:shadow-emerald-500/20 transition-all duration-500 ease-out transform group-hover:-translate-y-2"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&q=80&w=800" 
                            alt="Projects" 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Gradient Overlay: Fades to black at bottom */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                        {/* Title inside card */}
                        <div className="absolute bottom-0 left-0 p-8 w-full text-left">
                            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight group-hover:text-emerald-200 transition-colors">Select Project</h3>
                        </div>
                    </div>
                     {/* Description - Reveals on Hover */}
                    <div className="h-10 mt-4 px-2">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                            Jump directly into a specific project workspace.
                        </p>
                    </div>
                </div>

                {/* Option 3: Timesheet Management */}
                <div className="flex flex-col group w-full animate-fade-in-up [animation-delay:300ms] cursor-pointer" onClick={() => handleEnterApp('timesheet')}>
                    <div 
                        className="relative h-[480px] w-full overflow-hidden rounded-[2.5rem] shadow-xl group-hover:shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-500 ease-out transform group-hover:-translate-y-2"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" 
                            alt="Timesheet" 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Gradient Overlay: Fades to black at bottom */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                        {/* Title inside card */}
                        <div className="absolute bottom-0 left-0 p-8 w-full text-left">
                            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight group-hover:text-blue-200 transition-colors">Timesheet Management</h3>
                        </div>
                    </div>
                     {/* Description - Reveals on Hover */}
                    <div className="h-10 mt-4 px-2">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-center leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                            Import data, analyze efficiency, and generate PDF reports.
                        </p>
                    </div>
                </div>
            </div>

             {/* Create Project Modal (Accessible from landing page too) */}
            <CreateProjectModal 
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                onSave={handleCreateProject}
            />
        </div>
      );
  }
  
  if (appState === 'project-selection') {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 flex flex-col animate-fade-in transition-colors duration-200">
            <div className="max-w-7xl mx-auto w-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-10">
                  <button 
                      onClick={() => setAppState('landing')}
                      className="group flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors px-4 py-2 rounded-xl"
                  >
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </div>
                      <span className="font-medium text-lg">Back</span>
                  </button>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Your Projects</h1>
                  <div className="w-24"></div> {/* Spacer for visual balance */}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {goals.map(goal => (
                      <div 
                          key={goal.id}
                          onClick={() => handleEnterApp(goal.id)}
                          className="group bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg hover:shadow-2xl border border-slate-100 dark:border-slate-800 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 overflow-hidden flex flex-col"
                      >
                          {/* Image Header */}
                          <div className="h-48 w-full relative overflow-hidden">
                              <img 
                                src={getProjectImage(goal.id, goal.title)}
                                alt={goal.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <div className="absolute top-4 left-4">
                                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-sm border border-white/20 ${
                                      goal.type === GoalType.MONTHLY 
                                      ? 'bg-purple-500/80 text-white' 
                                      : 'bg-blue-500/80 text-white'
                                  }`}>
                                      {goal.type}
                                  </span>
                              </div>
                          </div>
                          
                          {/* Card Content */}
                          <div className="p-6 flex-1 flex flex-col">
                              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{goal.title}</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-2">{goal.description || 'No description provided.'}</p>
                              
                              <div className="mt-auto">
                                  {/* Progress Bar */}
                                  <div className="flex justify-between text-xs mb-2 font-medium">
                                      <span className="text-slate-400">Progress</span>
                                      <span className="text-slate-800 dark:text-slate-200">{Math.round((goal.loggedHours / goal.targetHours) * 100)}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                      <div 
                                          className="h-full bg-indigo-500 rounded-full"
                                          style={{ width: `${Math.min(100, (goal.loggedHours / goal.targetHours) * 100)}%` }}
                                      ></div>
                                  </div>

                                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                      <div className="flex flex-col">
                                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Target</span>
                                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{goal.targetHours}h</span>
                                      </div>
                                      <div className="flex flex-col text-right">
                                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Due Date</span>
                                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{new Date(goal.deadline).toLocaleDateString()}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}

                  {/* Create New Card */}
                  <button 
                      onClick={() => setIsCreateProjectOpen(true)}
                      className="min-h-[400px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                  >
                      <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 flex items-center justify-center mb-6 transition-colors">
                          <svg className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </div>
                      <span className="font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-xl transition-colors">Create New Project</span>
                      <p className="text-slate-400 text-sm mt-2">Start tracking a new goal</p>
                  </button>
              </div>
            </div>
            
            <CreateProjectModal 
              isOpen={isCreateProjectOpen}
              onClose={() => setIsCreateProjectOpen(false)}
              onSave={handleCreateProject}
            />
        </div>
      );
  }

  // New Project Detail View (No Sidebar)
  if (appState === 'project-detail') {
    const currentGoal = goals.find(g => g.id === currentView);
    const bgImage = currentGoal ? getProjectImage(currentGoal.id, currentGoal.title) : '';
    // Filter tasks for this project only
    const projectTasks = tasks.filter(t => t.linkedGoalId === currentView);
    
    // Scroll Threshold for Notch Transformation - IMMEDIATE ( > 10px )
    const isNotchMode = scrollTop > 10;

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in transition-colors duration-200 overflow-hidden relative">
             
             {/* Hidden File Input for Import */}
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json"
                onChange={handleFileImport}
             />

             {/* Transforming Header (Fixed) */}
             <div 
                className={`fixed z-50 transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) overflow-hidden shadow-xl
                    ${isNotchMode 
                        ? 'top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg h-16 rounded-full bg-slate-900/60 backdrop-blur-xl border border-white/10' 
                        : 'top-0 left-0 w-full h-80 rounded-b-[3rem] bg-slate-900 border-b-0 border-transparent'
                    }
                `}
             >
                 {/* Background Image - Only visible in Hero Mode */}
                <div className={`absolute inset-0 transition-opacity duration-500 ${isNotchMode ? 'opacity-0' : 'opacity-100'}`}>
                    {bgImage && (
                        <>
                            <img 
                                src={bgImage} 
                                alt="Background" 
                                className="w-full h-full object-cover opacity-60 blur-md scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
                        </>
                    )}
                </div>

                {/* Header Content */}
                <div className={`relative z-10 w-full h-full flex flex-col transition-all duration-500 ${isNotchMode ? 'px-4 justify-center' : 'px-8 py-8 justify-between'}`}>
                    
                    {/* Top Row: Navigation Buttons */}
                    <div className={`flex items-center justify-between w-full transition-all duration-500 ${isNotchMode ? 'absolute inset-0 px-4' : ''}`}>
                         {/* Back Button */}
                         <button 
                            onClick={() => setAppState('project-selection')}
                            className={`group flex items-center gap-2 rounded-full transition-colors ${isNotchMode ? 'p-2 hover:bg-white/10' : 'px-3 py-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 text-white'}`}
                            title="Back to Projects"
                         >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {!isNotchMode && <span className="font-medium hidden sm:block">All Projects</span>}
                         </button>
                         
                         {/* Centered Title in Notch Mode */}
                         <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 flex items-center gap-2 ${isNotchMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                            <span className="text-white font-bold text-sm truncate max-w-[150px]">{currentGoal?.title}</span>
                         </div>

                         {/* Add Button */}
                         <button 
                             onClick={openAddModal}
                             className={`flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
                                 isNotchMode 
                                 ? 'w-8 h-8 bg-indigo-500 text-white shadow-lg' 
                                 : 'px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/20 gap-2'
                             }`}
                             title="Add Objective"
                         >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                             {!isNotchMode && <span className="hidden sm:inline">Add Objective</span>}
                         </button>
                    </div>
                    
                    {/* Hero Title & Desc - Only visible in Hero Mode */}
                    <div className={`mt-auto transition-all duration-500 transform origin-bottom-left ${isNotchMode ? 'opacity-0 scale-75 translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}>
                         <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 text-white border border-white/10 uppercase tracking-wide backdrop-blur-sm">
                                 {currentGoal?.type}
                             </span>
                         </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">{currentGoal?.title}</h1>
                        <p className="text-slate-300 mt-2 max-w-2xl line-clamp-1">{currentGoal?.description}</p>
                    </div>
                </div>
             </div>

             {/* Content Scroll Area */}
             <div 
                className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50 dark:bg-slate-950"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
             >
                 {/* Spacer for Header */}
                 <div className="h-[340px] w-full"></div>

                 {/* Actual Content - Shifted up slightly to overlap with header curve in hero mode */}
                 <div className="max-w-5xl mx-auto pb-10 px-4 sm:px-8 -mt-8 relative z-10">
                     
                     {/* Task List (Topics/Checklist) */}
                     <PaperView 
                        viewMode={currentView}
                        goals={goals}
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onDeleteTask={handleDeleteTask}
                        onEditTask={openEditModal}
                        onToggleBacklog={handleToggleBacklog}
                        onAddTask={handleSaveTask}
                        onOpenAddModal={openAddModal}
                        onMoveSubtasksToBank={handleMoveSubtasksToBank}
                     />

                     {/* Analytics Section - MOVED BELOW OBJECTIVES */}
                     <div className="mt-10 mb-10">
                         <AnalysisPanel goals={currentGoal ? [currentGoal] : []} tasks={projectTasks} />
                     </div>

                     {/* Modern Stats Row - MOVED TO BOTTOM */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 mb-4">
                        {/* Card 1 */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-colors">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Target</span>
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{currentGoal?.targetHours}<span className="text-lg text-slate-400 font-medium ml-1">hrs</span></span>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                        </div>

                        {/* Card 2 */}
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Logged</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{currentGoal?.loggedHours}<span className="text-lg text-emerald-600/60 font-medium ml-1">hrs</span></span>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <span className="text-lg font-bold text-slate-300 dark:text-slate-600">
                                        {currentGoal ? Math.round((currentGoal.loggedHours / currentGoal.targetHours) * 100) : 0}%
                                     </span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${currentGoal ? Math.min(100, (currentGoal.loggedHours / currentGoal.targetHours) * 100) : 0}%` }}></div>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-purple-500/30 transition-colors">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Days Left</span>
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {currentGoal ? Math.ceil((new Date(currentGoal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0}
                                </span>
                                <span className="text-xs text-slate-400 block mt-1">{new Date(currentGoal?.deadline || '').toLocaleDateString()}</span>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        </div>
                     </div>

                     {/* Import/Export Actions */}
                     <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 mb-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleExportProjectJSON(currentView)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Save Project (JSON)
                            </button>
                             <button
                                onClick={handleImportClick}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Import Project (JSON)
                            </button>
                        </div>
                         <button
                            onClick={() => handleExportProjectCSV(currentView)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Export to Timesheet (CSV)
                        </button>
                     </div>

                 </div>
             </div>

             {/* Modals */}
             {activeTask && (
                <TimerModal 
                    task={activeTask} 
                    onClose={() => setActiveTask(null)} 
                    onComplete={handleSessionComplete} 
                />
             )}
             
             <AddTaskModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                goals={goals}
                initialGoalId={currentView}
                taskToEdit={editingTask}
             />

              <CreateProjectModal 
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                onSave={handleCreateProject}
              />
        </div>
    );
  }

  // Default App State (Sidebar + Main Content) - Used for Dashboard & Timesheet
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleEnterApp} 
        goals={goals}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onNavigateToSelection={() => setAppState('project-selection')}
        onNavigateToLanding={() => setAppState('landing')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative transition-colors duration-200">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-950 z-20 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white truncate">
                {currentView === 'all' ? 'All Tasks' : 
                 currentView === 'dashboard' ? 'Dashboard' :
                 currentView === 'timesheet' ? 'Timesheet & Integration' :
                 goals.find(g => g.id === currentView)?.title || 'Project'}
            </h2>
            <div className="flex items-center gap-4">
                 <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </button>
                 <button 
                    onClick={openAddModal}
                    className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 dark:hover:bg-indigo-600 text-slate-500 dark:text-slate-300 hover:text-white dark:hover:text-white flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/20"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </button>
                 <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                 </button>
            </div>
        </header>

        {/* Advice Notification Bar */}
        {tasksInProgress.length > 0 && (
             <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/20 px-6 py-3 flex items-center gap-3 animate-fade-in transition-colors">
                <div className="p-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    <span className="font-bold text-amber-600 dark:text-amber-500">Backlog Alert:</span> You have {tasksInProgress.length} tasks started but not finished. Try to find time to complete the remaining tasks you have.
                </p>
            </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {currentView === 'dashboard' ? (
                 <div className="max-w-6xl mx-auto p-8 space-y-8 animate-fade-in">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {goals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} onAddHours={() => {}} />
                        ))}
                    </section>
                    <section className="w-full">
                        <AnalysisPanel goals={goals} tasks={tasks} />
                    </section>
                    <section className="h-80">
                        <ProgressChart goals={goals} />
                    </section>
                 </div>
            ) : currentView === 'timesheet' ? (
                <TimesheetView tasks={tasks} goals={goals} onUpdateTask={handleSaveTask} />
            ) : (
                <PaperView 
                    viewMode={currentView}
                    goals={goals}
                    tasks={tasks}
                    onTaskClick={handleTaskClick}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={openEditModal}
                    onToggleBacklog={handleToggleBacklog}
                    onAddTask={handleSaveTask}
                    onOpenAddModal={openAddModal}
                    onMoveSubtasksToBank={handleMoveSubtasksToBank}
                />
            )}
        </div>
      </div>

      {/* Modals */}
      {activeTask && (
        <TimerModal 
            task={activeTask} 
            onClose={() => setActiveTask(null)} 
            onComplete={handleSessionComplete} 
        />
      )}

      <AddTaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        goals={goals}
        initialGoalId={currentView !== 'all' && currentView !== 'dashboard' ? currentView : undefined}
        taskToEdit={editingTask}
      />

      <CreateProjectModal 
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSave={handleCreateProject}
      />
    </div>
  );
};

export default App;

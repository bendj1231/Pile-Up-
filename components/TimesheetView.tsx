import React, { useState, useEffect, useRef } from 'react';
import { Task, TimesheetEntry, TaskCategory, Goal, TimesheetSource, TaskStatus } from '../types';
import { processTimesheetData, generateActivitySummary } from '../services/geminiService';
import TrendChart from './TrendChart';
import CategoryDistributionChart from './CategoryDistributionChart';

interface TimesheetViewProps {
  tasks: Task[];
  goals?: Goal[];
  onUpdateTask?: (task: Partial<Task>) => void;
}

const TimesheetView: React.FC<TimesheetViewProps> = ({ tasks, goals = [], onUpdateTask }) => {
  const [viewMode, setViewMode] = useState<'import' | 'report' | 'analytics' | 'refine'>('import');
  const [rawData, setRawData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [externalEntries, setExternalEntries] = useState<TimesheetEntry[]>([]);
  
  // Import State
  const [importTargetProjectId, setImportTargetProjectId] = useState<string>('');
  const [isProjectConfirmed, setIsProjectConfirmed] = useState(false);
  
  // Loading Animation State
  const [loadingText, setLoadingText] = useState('Conjugating Data...');
  const [isTextFading, setIsTextFading] = useState(false);
  
  // Staging Area for Refinement
  const [tempEntries, setTempEntries] = useState<TimesheetEntry[]>([]);

  // Analytics State
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Analytics Filter State
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'hour'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Report Configuration State
  const [reportConfig, setReportConfig] = useState({
    client: 'AJ Bowler Consult',
    jobTitle: 'VEOLIA DESALINATION PLANT CORNWALL UK ADJUDICATION',
    jobNo: '2023/009',
    activity: 'Benjamin Bowler, Data Analyst',
    month: new Date().toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    submittedBy: 'Benjamin Bowler'
  });
  
  // Convert internal tasks to timesheet entries
  const internalEntries: TimesheetEntry[] = tasks
    .filter(t => t.actualDurationMinutes > 0)
    .map(t => ({
      id: t.id,
      date: new Date(t.createdAt).toISOString().split('T')[0],
      title: t.title,
      category: t.category,
      durationMinutes: t.actualDurationMinutes,
      source: 'PILE_UP',
      notes: `${t.subtasks.filter(s => s.isCompleted).length} subtasks completed`,
      linkedGoalId: t.linkedGoalId,
      linkedGoalTitle: t.linkedGoalId ? goals.find(g => g.id === t.linkedGoalId)?.title : undefined
    }));

  const allEntries = [...internalEntries, ...externalEntries].sort((a, b) => b.date.localeCompare(a.date)); // Descending sort for timetable

  // --- Filtered Entries for Analytics ---
  const filteredEntries = allEntries.filter(entry => {
    if (timeRange === 'all') return true;
    
    const entryDate = new Date(entry.date);
    const filterDate = new Date(selectedDate);
    
    if (timeRange === 'day' || timeRange === 'hour') {
        return entry.date === selectedDate;
    }
    if (timeRange === 'week') {
         // Simple week filtering (current week of selected date)
         const firstDay = new Date(filterDate);
         const day = firstDay.getDay() || 7; 
         if (day !== 1) firstDay.setHours(-24 * (day - 1));
         const lastDay = new Date(firstDay);
         lastDay.setDate(lastDay.getDate() + 6);
         return entryDate >= firstDay && entryDate <= lastDay;
    }
    if (timeRange === 'month') {
        return entryDate.getMonth() === filterDate.getMonth() && entryDate.getFullYear() === filterDate.getFullYear();
    }
    if (timeRange === 'year') {
        return entryDate.getFullYear() === filterDate.getFullYear();
    }
    return true;
  });

  // Calculate Category Totals for Overall Overview
  const categoryTotals = filteredEntries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + entry.durationMinutes;
      return acc;
  }, {} as Record<string, number>);

  // Determine Dominant Project Context
  const projectCounts = filteredEntries.reduce((acc, entry) => {
      if (entry.linkedGoalId) {
          acc[entry.linkedGoalId] = (acc[entry.linkedGoalId] || 0) + 1;
      }
      return acc;
  }, {} as Record<string, number>);

  const dominantProjectId = Object.keys(projectCounts).sort((a, b) => projectCounts[b] - projectCounts[a])[0];
  const dominantGoal = goals.find(g => g.id === dominantProjectId);

  // Stats Calculation
  const totalInternal = internalEntries.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalExternal = externalEntries.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalTime = totalInternal + totalExternal;
  
  // Analytics Stats (Filtered)
  const analyticsTotalTime = filteredEntries.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const analyticsInternal = filteredEntries.filter(e => e.source === 'PILE_UP').reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const analyticsExternal = filteredEntries.filter(e => e.source === 'SCREEN_MONITOR').reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const productiveTime = filteredEntries
    .filter(e => [TaskCategory.RESEARCH, TaskCategory.CREATION, TaskCategory.LEARNING, TaskCategory.ACTIVITY].includes(e.category))
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);
  
  const leisureTime = filteredEntries
    .filter(e => e.category === TaskCategory.LEISURE)
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const efficiencyScore = analyticsTotalTime > 0 ? Math.round((productiveTime / analyticsTotalTime) * 100) : 0;

  // Recommendations Logic
  const getInsights = () => {
      const leisurePercent = (leisureTime / analyticsTotalTime) * 100;
      const suggestions: string[] = [];
      
      if (leisurePercent > 20) {
          suggestions.push("High leisure time detected. Consider reducing distraction intervals.");
      }
      if (!dominantGoal && analyticsTotalTime > 60) {
          suggestions.push("Work is scattered. Try associating more time with a specific project.");
      }
      if (dominantGoal) {
          const goalTasks = tasks.filter(t => t.linkedGoalId === dominantGoal.id && t.status === 'COMPLETED');
          if (goalTasks.length === 0 && analyticsTotalTime > 120) {
              suggestions.push(`You've logged significant time for "${dominantGoal.title}" but haven't marked tasks as complete.`);
          }
      }
      
      return suggestions;
  };

  const insights = getInsights();

  // Get Backlog Suggestions
  const backlogSuggestions = tasks.filter(t => 
      t.isBacklog && 
      t.status !== 'COMPLETED' && 
      (dominantProjectId ? t.linkedGoalId === dominantProjectId : true) // Filter by dominant project if exists, else show all
  ).slice(0, 3); // Top 3

  // --- Handlers ---

  const handleImport = async () => {
    if (!rawData.trim()) return;

    // --- SMART PARSING LOGIC ---
    // Attempt to parse known JSON structures directly before falling back to AI.
    try {
        const json = JSON.parse(rawData);

        // 1. Check for standard Project/Task list JSON
        let extractedTasks: any[] = [];
        if (Array.isArray(json)) {
            extractedTasks = json;
        } else if (json.tasks && Array.isArray(json.tasks)) {
            extractedTasks = json.tasks;
        } else if (json.goal && json.tasks) { // Project export format
            extractedTasks = json.tasks;
        }

        if (extractedTasks.length > 0) {
            const mappedEntries: TimesheetEntry[] = extractedTasks.map((t: any) => ({
                id: t.id || Date.now().toString() + Math.random(),
                date: t.date || (t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                title: t.title || 'Unknown Activity',
                category: t.category || TaskCategory.OTHER,
                durationMinutes: t.durationMinutes || t.actualDurationMinutes || 0,
                source: 'SCREEN_MONITOR' as TimesheetSource,
                notes: t.notes || t.description || 'Imported via JSON',
                linkedGoalId: t.linkedGoalId || undefined,
                linkedGoalTitle: t.linkedGoalId ? goals.find(g => g.id === t.linkedGoalId)?.title : undefined
            })).filter(e => e.durationMinutes > 0);

            if (mappedEntries.length > 0) {
                console.log("Successfully parsed structured JSON directly. Bypassing AI.");
                setTempEntries(mappedEntries);
                setRawData('');
                setImportTargetProjectId('');
                setIsProjectConfirmed(false);
                setViewMode('refine');
                return;
            }
        }

        // 2. Check for ActivityWatch JSON format (as per Python script logic)
        if (json.buckets) {
            const windowBucketKey = Object.keys(json.buckets).find(key => key.includes('aw-watcher-window'));
            if (windowBucketKey) {
                setIsProcessing(true);
                setLoadingText("Generating Summaries...");

                const events = json.buckets[windowBucketKey]?.events || [];
                
                const getCategoryForApp = (appName: string): TaskCategory => {
                    const lowerAppName = appName.toLowerCase();
                    if (lowerAppName.includes('safari')) return TaskCategory.RESEARCH;
                    if (lowerAppName.includes('drive')) return TaskCategory.FILE_SORTING;
                    if (lowerAppName.includes('ai studio')) return TaskCategory.CREATION;
                    if (lowerAppName.includes('google gemini')) return TaskCategory.CREATION;
                    if (lowerAppName.includes('ia writer')) return TaskCategory.DOCUMENTATION;
                    if (lowerAppName.includes('finder')) return TaskCategory.FILE_SORTING;
                    if (lowerAppName.includes('cursor')) return TaskCategory.CREATION;
                    if (lowerAppName.includes('ajbc')) return TaskCategory.RESEARCH;
                    if (lowerAppName.includes('ajbowlerconsult')) return TaskCategory.RESEARCH;
                    if (lowerAppName.includes('wingmentor')) return TaskCategory.CREATION;
                    return TaskCategory.OTHER;
                };

                const groupedData: { [date: string]: { [app: string]: number } } = {};
                for (const event of events) {
                    if (event.data && event.data.app && event.duration && event.timestamp) {
                        const date = new Date(event.timestamp).toISOString().split('T')[0];
                        const app = event.data.app;
                        const duration = event.duration;

                        if (!groupedData[date]) groupedData[date] = {};
                        if (!groupedData[date][app]) groupedData[date][app] = 0;
                        groupedData[date][app] += duration;
                    }
                }

                const entryPromises: Promise<TimesheetEntry>[] = [];
                const projectContext = importTargetProjectId ? goals.find(g => g.id === importTargetProjectId) : null;
                
                for (const date in groupedData) {
                    for (const app in groupedData[date]) {
                        const durationSeconds = groupedData[date][app];
                        const durationMinutes = Math.round(durationSeconds / 60);
                        if (durationMinutes > 0) {
                            const promise = (async () => {
                                const summary = await generateActivitySummary(app, durationMinutes, projectContext || undefined);
                                return {
                                    id: `${date}-${app}-${Math.random()}`,
                                    date: date,
                                    title: app,
                                    durationMinutes: durationMinutes,
                                    category: getCategoryForApp(app),
                                    // FIX: Cast string literal to TimesheetSource to match the expected type.
                                    source: 'SCREEN_MONITOR' as TimesheetSource,
                                    notes: summary,
                                    linkedGoalId: importTargetProjectId || undefined,
                                    linkedGoalTitle: projectContext?.title
                                };
                            })();
                            entryPromises.push(promise);
                        }
                    }
                }

                const newEntries = await Promise.all(entryPromises);
                setIsProcessing(false);

                if (newEntries.length > 0) {
                    console.log("Successfully parsed ActivityWatch JSON with AI summaries.");
                    setTempEntries(newEntries);
                    setRawData('');
                    setImportTargetProjectId('');
                    setIsProjectConfirmed(false);
                    setViewMode('refine');
                    return;
                }
            }
        }

    } catch (error) {
        console.log("Not a recognized JSON format, falling back to AI for parsing.", error);
    }
    // --- END SMART PARSING ---

    // 3. Fallback to AI processing for unstructured data
    setIsProcessing(true);
    
    const messages = ["Conjugating Data...", "Generating Timesheet...", "Have a beer while generating..."];
    let msgIndex = 0;
    setLoadingText(messages[0]);
    
    const intervalId = setInterval(() => {
        setIsTextFading(true);
        setTimeout(() => {
            msgIndex = (msgIndex + 1) % messages.length;
            setLoadingText(messages[msgIndex]);
            setIsTextFading(false);
        }, 300);
    }, 2500);

    try {
        const projectContext = goals.map(g => ({ id: g.id, title: g.title, description: g.description }));
        
        const newEntries = await processTimesheetData(rawData, projectContext, importTargetProjectId);
        
        if (newEntries.length === 0) {
            alert("Processing returned no data or timed out. Please try again with smaller data or check your API key.");
        }

        setTempEntries(newEntries);
        setRawData('');
        setImportTargetProjectId('');
        setIsProjectConfirmed(false);
        setViewMode('refine');
    } catch (e) {
        console.error("Import failed", e);
        alert("An error occurred during processing.");
    } finally {
        clearInterval(intervalId);
        setIsProcessing(false);
        setLoadingText("Conjugating Data...");
        setIsTextFading(false);
    }
  };

  const handleStopProcessing = () => {
    setIsProcessing(false);
    setLoadingText("Conjugating Data...");
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
            setRawData(content);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Bulk Upload Handler
  const handleBulkFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newBulkEntries: TimesheetEntry[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const json = JSON.parse(content);
                
                // Determine structure: Is it a Project Export (has .tasks) or a Raw Entry List?
                let extractedTasks: any[] = [];
                
                if (Array.isArray(json)) {
                    extractedTasks = json;
                } else if (json.tasks && Array.isArray(json.tasks)) {
                    extractedTasks = json.tasks;
                }

                // Map to TimesheetEntry
                const mappedEntries: TimesheetEntry[] = extractedTasks.map((t: any) => ({
                    id: t.id || Date.now().toString() + Math.random(),
                    date: t.date || (t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                    title: t.title || 'Unknown Activity',
                    category: t.category || TaskCategory.OTHER,
                    durationMinutes: t.durationMinutes || t.actualDurationMinutes || 0,
                    source: 'SCREEN_MONITOR' as TimesheetSource,
                    notes: t.notes || t.description || 'Imported via Bulk Upload',
                    linkedGoalId: t.linkedGoalId || undefined
                })).filter(e => e.durationMinutes > 0);

                newBulkEntries.push(...mappedEntries);
            } catch (err) {
                console.error(`Failed to parse file: ${file.name}`, err);
            } finally {
                processedCount++;
                if (processedCount === files.length) {
                    setTempEntries(prev => [...prev, ...newBulkEntries]); // Staging
                    setViewMode('refine'); // Switch to refine
                    // Reset input
                    if (bulkInputRef.current) bulkInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    });
  };

  const toggleDateExpansion = (date: string) => {
      setExpandedDates(prev => 
        prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
      );
  };

  const handlePrint = () => {
      window.print();
  };

  // Refine Actions
  const handleUpdateTempEntry = (id: string, field: keyof TimesheetEntry, value: any) => {
      setTempEntries(prev => prev.map(e => {
          if (e.id === id) {
              const updated = { ...e, [field]: value };
              // If updating project link, try to fetch title
              if (field === 'linkedGoalId') {
                  const goal = goals.find(g => g.id === value);
                  updated.linkedGoalTitle = goal ? goal.title : undefined;
              }
              return updated;
          }
          return e;
      }));
  };

  const handleDeleteTempEntry = (id: string) => {
      setTempEntries(prev => prev.filter(e => e.id !== id));
  };

  // Analytics Logs Actions
  const handleUpdateLogEntry = (id: string, field: keyof TimesheetEntry, value: any) => {
      // 1. Check External
      const isExternal = externalEntries.some(e => e.id === id);
      if (isExternal) {
          setExternalEntries(prev => prev.map(e => {
              if (e.id === id) {
                  const updated = { ...e, [field]: value };
                  if (field === 'linkedGoalId') {
                      const goal = goals.find(g => g.id === value);
                      updated.linkedGoalTitle = goal ? goal.title : undefined;
                  }
                  return updated;
              }
              return e;
          }));
          return;
      }

      // 2. Check Internal (Tasks)
      const task = tasks.find(t => t.id === id);
      if (task && onUpdateTask) {
          const update: Partial<Task> = { id };
          
          if (field === 'title') update.title = value;
          if (field === 'category') update.category = value;
          if (field === 'durationMinutes') update.actualDurationMinutes = value;
          if (field === 'linkedGoalId') update.linkedGoalId = value;
          
          // Note: Updating date for internal tasks (createdAt) is complex as it shifts the entire task's creation time.
          // For simplicity, we allow it here assuming the user knows they are shifting the task's record.
          if (field === 'date') {
              const oldDate = new Date(task.createdAt);
              const newDate = new Date(value);
              // Preserve time
              newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
              update.createdAt = newDate.getTime();
          }

          onUpdateTask(update);
      }
  };

  const handleDeleteLogEntry = (id: string) => {
      const isExternal = externalEntries.some(e => e.id === id);
      if (isExternal) {
          if(confirm("Delete this imported entry?")) {
            setExternalEntries(prev => prev.filter(e => e.id !== id));
          }
      } else {
          if (onUpdateTask) {
              if (confirm("Remove this time log? This will reset the task duration to 0.")) {
                  onUpdateTask({ id, actualDurationMinutes: 0 });
              }
          }
      }
  };

  const handleRemoveCategoryFromTemp = (category: TaskCategory) => {
      if (confirm(`Remove all items categorized as ${category}?`)) {
          setTempEntries(prev => prev.filter(e => e.category !== category));
      }
  };

  const handleConfirmMerge = () => {
    setExternalEntries(prev => {
        const entryMap: { [key: string]: TimesheetEntry } = {};

        // Combine previous and new entries and process them to handle duplicates
        [...prev, ...tempEntries].forEach(entry => {
            const key = `${entry.date}|${entry.title.toLowerCase()}`;
            if (entryMap[key]) {
                // If entry already exists in our map, sum the duration
                entryMap[key].durationMinutes += entry.durationMinutes;
                // And combine notes
                const combinedNotes = [entryMap[key].notes, entry.notes]
                    .filter(Boolean)
                    .join(' | ');
                entryMap[key].notes = combinedNotes;
            } else {
                // Otherwise, add it to the map (create a copy to avoid mutation)
                entryMap[key] = { ...entry };
            }
        });
        
        // Convert map back to an array for state
        return Object.values(entryMap);
    });

    setTempEntries([]);
    setViewMode('analytics');
  };

  const handleDiscardTemp = () => {
      if (confirm("Discard all imported entries?")) {
          setTempEntries([]);
          setViewMode('import');
      }
  };

  // Helper to format date as DD/MM/YY
  const formatDateDDMMYY = (isoDate: string) => {
      const d = new Date(isoDate);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
  };

  // Helper for colors
  const getCategoryColorStyles = (cat: TaskCategory) => {
    switch (cat) {
        case TaskCategory.RESEARCH: return { bg: 'bg-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-900/10', text: 'text-orange-600 dark:text-orange-400' };
        case TaskCategory.CREATION: return { bg: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-400' };
        case TaskCategory.LEARNING: return { bg: 'bg-emerald-500', bgLight: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400' };
        case TaskCategory.ACTIVITY: return { bg: 'bg-yellow-400', bgLight: 'bg-yellow-50 dark:bg-yellow-900/10', text: 'text-yellow-600 dark:text-yellow-400' };
        case TaskCategory.LEISURE: return { bg: 'bg-red-500', bgLight: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-600 dark:text-red-400' };
        case TaskCategory.FILE_SORTING: return { bg: 'bg-gray-500', bgLight: 'bg-gray-50 dark:bg-gray-900/10', text: 'text-gray-600 dark:text-gray-400' };
        case TaskCategory.DOCUMENTATION: return { bg: 'bg-cyan-500', bgLight: 'bg-cyan-50 dark:bg-cyan-900/10', text: 'text-cyan-600 dark:text-cyan-400' };
        default: return { bg: 'bg-slate-400', bgLight: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500' };
    }
  };

  // Carousel Options
  const projectOptions = [
    { id: '', title: 'Auto-Multitasking', description: 'Let AI infer context across all projects' },
    ...goals.map(g => ({ id: g.id, title: g.title, description: g.description }))
  ];

  const handleCarouselSelect = (id: string, index: number) => {
      setImportTargetProjectId(id);
      setIsProjectConfirmed(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in space-y-8">
      
      {/* View Toggle Header (Hidden when printing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Timesheet & Analytics</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage logs, analyze trends, and generate reports.</p>
        </div>
        
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button 
                onClick={() => setViewMode('import')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'import' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
                AI Import
            </button>
            <button 
                onClick={() => setViewMode('report')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'report' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
                Timesheet Report
            </button>
            <button 
                onClick={() => setViewMode('analytics')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'analytics' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
                Analytics
            </button>
        </div>
      </div>

      {viewMode === 'import' && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative animate-fade-in">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

            <div className="p-8 md:p-10">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </span>
                            Time Sheet Generator
                        </h2>
                        <p className="text-slate-500 text-sm mt-2 ml-14 max-w-lg">Upload structured JSON or unstructured logs. The system will parse activity, estimate duration, and correlate it with your selected project.</p>
                    </div>
                </div>

                {!rawData ? (
                    <div 
                        onClick={handleUploadClick}
                        className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-400 transition-all group overflow-hidden"
                    >
                         <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden" 
                            accept=".json,.txt,.csv"
                        />
                        <div className="w-24 h-24 bg-white dark:bg-slate-800 shadow-xl rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10 border border-slate-100 dark:border-slate-700">
                            <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <span className="text-2xl font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10">Click to Upload File</span>
                        <span className="text-sm text-slate-400 mt-2 relative z-10">Supports JSON, Text, CSV</span>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <span className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Data Source Loaded
                            </span>
                            <button 
                                onClick={() => setRawData('')}
                                className="text-xs font-bold text-red-400 hover:text-red-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                            >
                                Clear File
                            </button>
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute top-3 right-3 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">PREVIEW</div>
                            <textarea 
                                value={rawData}
                                onChange={(e) => setRawData(e.target.value)}
                                className="w-full h-32 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-mono text-slate-600 dark:text-slate-400 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>
                )}

                {/* FUTURISTIC PROJECT CAROUSEL */}
                <div className="mt-12 mb-8">
                    <h3 className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-slate-300 dark:bg-slate-700"></span>
                        Merge Selectable Project Data to Timesheet
                        <span className="h-px w-8 bg-slate-300 dark:bg-slate-700"></span>
                    </h3>

                    <div className="relative group w-full">
                         {/* Gradient Fade Edges */}
                         <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-20 pointer-events-none"></div>
                         <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-20 pointer-events-none"></div>

                         {/* Revolving Container */}
                         <div 
                            ref={carouselRef}
                            className="flex overflow-x-auto gap-6 pb-8 px-[30%] snap-x snap-mandatory hide-scrollbar relative z-10"
                            style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                         >
                            {projectOptions.map((option, idx) => {
                                const isSelected = importTargetProjectId === option.id;
                                return (
                                    <div 
                                        key={option.id || 'auto'}
                                        onClick={() => {
                                            handleCarouselSelect(option.id, idx);
                                            // Optional: Scroll this element into center view
                                            const el = document.getElementById(`carousel-item-${idx}`);
                                            el?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                                        }}
                                        id={`carousel-item-${idx}`}
                                        className={`
                                            flex-shrink-0 w-64 snap-center rounded-3xl p-6 cursor-pointer transition-all duration-500 ease-out border
                                            flex flex-col items-center text-center relative overflow-hidden group/card
                                            ${isSelected 
                                                ? 'bg-slate-900 dark:bg-slate-800 border-indigo-500/50 dark:border-indigo-400 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] scale-110 z-10' 
                                                : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 scale-95 opacity-60 hover:opacity-100 hover:scale-100 grayscale hover:grayscale-0'
                                            }
                                        `}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 pointer-events-none"></div>
                                        )}
                                        
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {option.id === '' ? (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                            )}
                                        </div>

                                        <h4 className={`font-bold text-lg mb-1 truncate w-full ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {option.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5em]">
                                            {option.description || 'No description'}
                                        </p>
                                        
                                        {isSelected && (
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_2px_rgba(99,102,241,0.8)]"></div>
                                        )}
                                    </div>
                                );
                            })}
                         </div>

                         {/* Confirm Selection Button - Below Carousel */}
                         <div className="flex justify-center mt-4">
                            <button
                                onClick={() => setIsProjectConfirmed(true)}
                                className={`
                                    relative px-8 py-3 rounded-full font-bold text-sm tracking-wider uppercase transition-all duration-300 transform
                                    ${isProjectConfirmed 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105 cursor-default' 
                                        : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 shadow-sm hover:shadow-indigo-500/20 hover:-translate-y-1'
                                    }
                                `}
                            >
                                {isProjectConfirmed ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        Context Locked
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        Press to Confirm
                                    </span>
                                )}
                            </button>
                         </div>
                    </div>
                </div>

                {/* Final Process Button */}
                <div className="flex justify-center pt-6 border-t border-slate-100 dark:border-slate-800 gap-4">
                    {isProcessing && (
                         <button 
                            onClick={handleStopProcessing}
                            className="px-6 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl font-bold transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
                         >
                            Cancel
                         </button>
                    )}
                    <button 
                        onClick={handleImport}
                        disabled={isProcessing || !rawData.trim()}
                        className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95 w-72 justify-center"
                    >
                        {isProcessing ? (
                            <>
                                <svg className="w-6 h-6 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className={`transition-opacity duration-300 ${isTextFading ? 'opacity-0' : 'opacity-100'}`}>
                                    {loadingText}
                                </span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                <span>Process & Merge Data</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ... (Refine View Code - Unchanged) ... */}
      {viewMode === 'refine' && (
          <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-fade-in flex flex-col h-[80vh]">
              {/* Refine Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Refine & Edit Segments
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Review imported data before adding to your official timesheet. Leisure items should be removed.
                      </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <div className="text-center px-2">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Items</span>
                          <span className="block text-lg font-bold text-slate-900 dark:text-white">{tempEntries.length}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                      <div className="text-center px-2">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Total Hours</span>
                          <span className="block text-lg font-bold text-indigo-500">{(tempEntries.reduce((acc, e) => acc + e.durationMinutes, 0) / 60).toFixed(1)}h</span>
                      </div>
                  </div>
              </div>

              {/* Bulk Actions */}
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
                  <button 
                    onClick={() => handleRemoveCategoryFromTemp(TaskCategory.LEISURE)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Remove All Leisure
                  </button>
                  <button
                    onClick={() => {
                        if(confirm("Remove all items shorter than 1 minute?")) {
                            setTempEntries(prev => prev.filter(e => e.durationMinutes >= 1));
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                      Remove &lt; 1 min
                  </button>
              </div>

              {/* Editable List */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4 space-y-3 custom-scrollbar">
                  {tempEntries.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <p>No items to review.</p>
                      </div>
                  )}
                  {tempEntries.map((entry) => (
                      <div key={entry.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
                            {/* Left: Date */}
                            <div className="w-full md:w-16 flex-shrink-0 text-center md:text-left">
                                <span className="text-xs font-mono text-slate-400">{formatDateDDMMYY(entry.date)}</span>
                            </div>

                            {/* Middle: Main Inputs */}
                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Title Input */}
                                <input 
                                    type="text" 
                                    value={entry.title}
                                    onChange={(e) => handleUpdateTempEntry(entry.id, 'title', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                                />
                                
                                {/* Meta Controls */}
                                <div className="flex gap-2">
                                    {/* Category Select */}
                                    <select
                                        value={entry.category}
                                        onChange={(e) => handleUpdateTempEntry(entry.id, 'category', e.target.value)}
                                        className={`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-indigo-500 ${
                                            entry.category === TaskCategory.LEISURE ? 'text-red-500' : 
                                            entry.category === TaskCategory.RESEARCH ? 'text-orange-500' :
                                            entry.category === TaskCategory.CREATION ? 'text-blue-500' :
                                            entry.category === TaskCategory.LEARNING ? 'text-emerald-500' :
                                            entry.category === TaskCategory.ACTIVITY ? 'text-yellow-500' :
                                            entry.category === TaskCategory.FILE_SORTING ? 'text-gray-500' :
                                            entry.category === TaskCategory.DOCUMENTATION ? 'text-cyan-500' :
                                            'text-slate-500'
                                        }`}
                                    >
                                        {Object.values(TaskCategory).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    {/* Project Link Select */}
                                    <select 
                                        value={entry.linkedGoalId || ''}
                                        onChange={(e) => handleUpdateTempEntry(entry.id, 'linkedGoalId', e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">(No Project Link)</option>
                                        {goals.map(g => (
                                            <option key={g.id} value={g.id}>{g.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right: Duration & Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                <div className="relative w-20">
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={entry.durationMinutes}
                                        onChange={(e) => handleUpdateTempEntry(entry.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-6 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-right"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                                </div>
                                
                                <button 
                                    onClick={() => handleDeleteTempEntry(entry.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete Item"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                          </div>
                          <div className="w-full mt-3 pl-0 md:pl-20">
                              <input
                                  type="text"
                                  value={entry.notes || ''}
                                  onChange={(e) => handleUpdateTempEntry(entry.id, 'notes', e.target.value)}
                                  placeholder="Notes / AI Summary"
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                          </div>
                      </div>
                  ))}
              </div>

              {/* Bottom Actions */}
              <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <button 
                      onClick={handleDiscardTemp}
                      className="px-6 py-3 text-slate-500 hover:text-red-600 font-bold transition-colors"
                  >
                      Discard All
                  </button>
                  <button 
                      onClick={handleConfirmMerge}
                      disabled={tempEntries.length === 0}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                      Confirm Merge to Timesheet
                  </button>
              </div>
          </div>
      )}

      {viewMode === 'analytics' && (
        <div className="space-y-8 animate-fade-in pb-10">
            
            {/* Historical Data Upload Section */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-200">Load Historical Data</h2>
                    <p className="text-indigo-700 dark:text-indigo-400 text-sm mt-1">
                        Upload multiple <strong>.json</strong> files (project exports or raw activity logs) to populate trends, category breakdowns, and efficiency scores instantly.
                    </p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-2 font-mono">
                        Currently Loaded: <span className="font-bold">{externalEntries.length}</span> external entries
                    </p>
                </div>
                <div className="flex gap-3">
                     <button
                        onClick={() => bulkInputRef.current?.click()}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Select Files
                     </button>
                     {externalEntries.length > 0 && (
                         <button
                            onClick={() => setExternalEntries([])}
                            className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all"
                         >
                            Clear
                         </button>
                     )}
                     <input 
                        type="file" 
                        ref={bulkInputRef}
                        onChange={handleBulkFilesChange}
                        className="hidden" 
                        accept=".json"
                        multiple 
                     />
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['hour', 'day', 'week', 'month', 'year', 'all'] as const).map((range) => (
                         <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                timeRange === range 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' 
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                         >
                             {range === 'day' ? 'Daily' : range === 'week' ? 'Weekly' : range === 'month' ? 'Monthly' : range === 'year' ? 'Yearly' : range === 'hour' ? 'Hourly' : 'All Time'}
                         </button>
                    ))}
                </div>
                
                {timeRange !== 'all' && (
                    <input 
                        type={timeRange === 'year' ? 'number' : timeRange === 'month' ? 'month' : 'date'}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium"
                    />
                )}
            </div>

            {/* Overall Composition & Insights */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-visible animate-fade-in p-8">
                {/* ... (Charts and breakdown code unchanged) ... */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </span>
                            Overall Composition & Insights
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">Breakdown of the selected {analyticsTotalTime} minutes of activity.</p>
                    </div>
                    {dominantGoal && (
                        <div className="hidden md:block bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                            Context: {dominantGoal.title}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    
                    {/* Left: Category Rows with Popups */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Time Distribution (Hover for Insights)</h4>
                        {Object.entries(categoryTotals)
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .map(([cat, val]) => {
                            const minutes = val as number;
                            const percentage = (minutes / Math.max(1, analyticsTotalTime)) * 100;
                            const styles = getCategoryColorStyles(cat as TaskCategory);
                            
                            // Determine Performance / Insight Text
                            let insightText = "Steady progress made in this area.";
                            if (percentage > 40) insightText = "Dominant focus area. You dedicated significant time here.";
                            else if (percentage < 10) insightText = "Low activity detected. Consider allocating more focus time if this is a priority.";
                            else if (cat === TaskCategory.LEISURE && percentage > 25) insightText = "High leisure ratio. Check if this aligns with your productivity goals.";

                            // Find Missed/Backlog Tasks for this Category & Project
                            const specificBacklog = tasks.filter(t => 
                                t.isBacklog && 
                                t.status !== 'COMPLETED' && 
                                t.category === cat &&
                                (!dominantProjectId || t.linkedGoalId === dominantProjectId)
                            ).slice(0, 3); // Limit to 3

                            return (
                                <div key={cat} className="group relative cursor-help">
                                    {/* The Visual Row */}
                                    <div className="flex items-center justify-between mb-2 text-sm">
                                        <span className={`font-bold ${styles.text}`}>{cat}</span>
                                        <span className="font-mono text-slate-600 dark:text-slate-300">{Math.round(minutes)}m <span className="text-slate-400 text-xs">({Math.round(percentage)}%)</span></span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${styles.bg} transition-all duration-1000 ease-out relative`}
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </div>
                                    </div>

                                    {/* THE POPUP CARD */}
                                    <div className="absolute left-0 bottom-full mb-3 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0">
                                        <div className="absolute left-6 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 transform rotate-45"></div>
                                        
                                        <h5 className={`text-xs font-bold uppercase tracking-widest mb-2 ${styles.text}`}>Analysis: {cat}</h5>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                                            {insightText}
                                        </p>

                                        {specificBacklog.length > 0 ? (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                                                <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Missed Opportunities / Bank</h6>
                                                <ul className="space-y-1.5">
                                                    {specificBacklog.map(task => (
                                                        <li key={task.id} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${styles.bg}`}></span>
                                                            <span className="truncate">{task.title}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-400 italic">No pending backlog items found for this category.</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(categoryTotals).length === 0 && (
                            <div className="text-center py-8 text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No data available for breakdown.</div>
                        )}
                    </div>

                    {/* Right: Insights & Backlog Recommendations */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        
                        {/* Status Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                General Analysis
                            </h4>
                            <ul className="space-y-2">
                                {insights.length > 0 ? insights.map((insight, idx) => (
                                    <li key={idx} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        {insight}
                                    </li>
                                )) : (
                                    <li className="text-sm text-slate-500 italic">Distribution looks balanced.</li>
                                )}
                            </ul>
                        </div>

                        {/* Backlog Recommendations */}
                        {backlogSuggestions.length > 0 && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800 flex-1">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                    Next Recommended Tasks
                                </h4>
                                <div className="space-y-2">
                                    {backlogSuggestions.map(task => (
                                        <div key={task.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm flex items-center justify-between group cursor-default">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${getCategoryColorStyles(task.category).bg}`}></div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{task.title}</span>
                                            </div>
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{task.plannedDurationMinutes}m</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-center">
                                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">From Task Bank</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Efficiency Breakdown Bar */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">Efficiency Ratio</h3>
                 <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(productiveTime / Math.max(1, analyticsTotalTime)) * 100}%` }}></div>
                    <div className="h-full bg-red-500" style={{ width: `${(leisureTime / Math.max(1, analyticsTotalTime)) * 100}%` }}></div>
                    <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: `${((analyticsTotalTime - productiveTime - leisureTime) / Math.max(1, analyticsTotalTime)) * 100}%` }}></div>
                 </div>
                 <div className="flex justify-between mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                     <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Productive ({Math.round((productiveTime/Math.max(1, analyticsTotalTime))*100)}%)</span>
                     <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Leisure ({Math.round((leisureTime/Math.max(1, analyticsTotalTime))*100)}%)</span>
                     <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>Other</span>
                 </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[400px]">
                {/* Main Trend Graph */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">Activity Trend</h3>
                    <div className="flex-1 min-h-[300px]">
                        <TrendChart entries={filteredEntries} timeRange={timeRange === 'hour' ? 'day' : timeRange} />
                    </div>
                </div>

                {/* Distribution Pie */}
                <div className="lg:col-span-1">
                    <CategoryDistributionChart entries={filteredEntries} title="Category Breakdown" variant="card" />
                </div>
            </div>

            {/* Source Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time Out Timers</span>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                        {Math.floor(analyticsInternal / 60)}h {(Math.round(analyticsInternal) % 60)}m
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Imported Data</span>
                    <div className="text-3xl font-bold text-indigo-500 mt-1">
                        {Math.floor(analyticsExternal / 60)}h {(Math.round(analyticsExternal) % 60)}m
                    </div>
                </div>
                {/* Interactive Logged Component */}
                <div 
                    onClick={() => setIsClosureModalOpen(true)}
                    className="bg-slate-900 dark:bg-indigo-900 p-6 rounded-2xl border border-slate-800 dark:border-indigo-800 shadow-sm text-white cursor-pointer hover:scale-105 transition-transform active:scale-95 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-400 dark:text-indigo-200 uppercase tracking-widest">Total Logged</span>
                        <svg className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </div>
                    <div className="text-3xl font-bold mt-1">
                        {Math.floor(analyticsTotalTime / 60)}h {(Math.round(analyticsTotalTime) % 60)}m
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view report & tick tasks</p>
                </div>
            </div>

            {/* --- DETAILED LOGS & EDITOR TABLE (Renamed) --- */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-visible mt-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center rounded-t-[2rem]">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            Detailed Logs & Objectives
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review and modify specific entries from both internal timers and external imports.</p>
                    </div>
                    <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">{filteredEntries.length} entries</span>
                </div>
                
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar rounded-b-[2rem]">
                    {filteredEntries.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <p>No entries found for the selected period.</p>
                        </div>
                    )}
                    {filteredEntries.map((entry) => (
                        <LogEntryRow 
                            key={entry.id}
                            entry={entry}
                            tasks={tasks}
                            goals={goals}
                            onUpdateEntry={handleUpdateLogEntry}
                            onDeleteEntry={handleDeleteLogEntry}
                            onCompleteTask={(task) => onUpdateTask && onUpdateTask({...task, status: TaskStatus.COMPLETED})}
                        />
                    ))}
                </div>
            </div>

            {/* Session Closure Modal */}
            {isClosureModalOpen && (
                <SessionClosureModal 
                    isOpen={isClosureModalOpen}
                    onClose={() => setIsClosureModalOpen(false)}
                    entries={filteredEntries}
                    tasks={tasks}
                    goals={goals}
                    onCompleteTask={(task) => onUpdateTask && onUpdateTask({...task, status: TaskStatus.COMPLETED})}
                    defaultGoalId={dominantGoal?.id}
                />
            )}

        </div>
      )}

      {/* ... (Report View Code - Unchanged) ... */}
      {viewMode === 'report' && (
        // ... (Report View Content from previous change) ...
        <div className="animate-fade-in flex flex-col items-center space-y-8 pb-20">
            {/* ... Report View Code (Unchanged) ... */}
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Report Configuration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Activity / Name</label>
                        <input 
                            type="text"
                            value={reportConfig.activity}
                            onChange={(e) => setReportConfig({...reportConfig, activity: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Submitted By</label>
                        <input 
                            type="text"
                            value={reportConfig.submittedBy}
                            onChange={(e) => setReportConfig({...reportConfig, submittedBy: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client Name</label>
                        <input 
                            type="text"
                            value={reportConfig.client}
                            onChange={(e) => setReportConfig({...reportConfig, client: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Report Month</label>
                        <input 
                            type="text"
                            value={reportConfig.month}
                            onChange={(e) => setReportConfig({...reportConfig, month: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Title / Project</label>
                        <textarea 
                            value={reportConfig.jobTitle}
                            rows={2}
                            onChange={(e) => setReportConfig({...reportConfig, jobTitle: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* A4 Paper Report Preview */}
            <div className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-10 md:p-12 shadow-2xl print:shadow-none print:w-full print:max-w-none print:p-0 relative">
                
                {/* Header Details */}
                <div className="grid grid-cols-[100px_1fr] gap-y-2 mb-8 text-sm">
                    <div className="font-bold">Client:</div>
                    <input 
                        className="font-normal bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none w-full"
                        value={reportConfig.client}
                        onChange={(e) => setReportConfig({...reportConfig, client: e.target.value})}
                    />
                    
                    <div className="font-bold">Job Title:</div>
                    <input 
                        className="font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none w-full uppercase"
                        value={reportConfig.jobTitle}
                        onChange={(e) => setReportConfig({...reportConfig, jobTitle: e.target.value})}
                    />

                    <div className="font-bold">CB Job No.:</div>
                    <input 
                        className="font-normal bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none w-full"
                        value={reportConfig.jobNo}
                        onChange={(e) => setReportConfig({...reportConfig, jobNo: e.target.value})}
                    />
                    
                    <div className="font-bold">Activity:</div>
                    <input 
                        className="font-normal bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none w-full"
                        value={reportConfig.activity}
                        onChange={(e) => setReportConfig({...reportConfig, activity: e.target.value})}
                    />

                    <div className="font-bold">Month:</div>
                    <input 
                        className="font-normal bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none w-full"
                        value={reportConfig.month}
                        onChange={(e) => setReportConfig({...reportConfig, month: e.target.value})}
                    />
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-slate-300 mb-8">
                    <thead>
                        <tr className="bg-[#1e3a8a] text-white print:bg-[#1e3a8a] print:text-white">
                            <th className="border border-slate-300 p-2 text-left w-[15%] uppercase font-bold text-sm">DATE</th>
                            <th className="border border-slate-300 p-2 text-left w-[70%] uppercase font-bold text-sm">DESCRIPTION OF SERVICES</th>
                            <th className="border border-slate-300 p-2 text-right w-[15%] uppercase font-bold text-sm">HOURS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allEntries.map((entry) => (
                            <tr key={entry.id} className="text-sm">
                                <td className="border border-slate-300 p-2 align-top font-medium">{formatDateDDMMYY(entry.date)}</td>
                                <td className="border border-slate-300 p-2 align-top">
                                    <div className="font-normal">
                                        {entry.title} 
                                        {entry.linkedGoalTitle && <span className="text-slate-400 text-xs ml-2">({entry.linkedGoalTitle})</span>}
                                    </div>
                                    {entry.notes && <div className="text-slate-600 mt-1 italic">{entry.notes}</div>}
                                </td>
                                <td className="border border-slate-300 p-2 align-top text-right font-medium">
                                    {(entry.durationMinutes / 60).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {/* Fill empty rows to make it look like a full sheet if few entries */}
                        {allEntries.length < 8 && Array.from({ length: 8 - allEntries.length }).map((_, i) => (
                            <tr key={`empty-${i}`} className="text-sm">
                                <td className="border border-slate-300 p-2 text-transparent select-none">&nbsp;</td>
                                <td className="border border-slate-300 p-2 text-transparent select-none">&nbsp;</td>
                                <td className="border border-slate-300 p-2 text-transparent select-none">&nbsp;</td>
                            </tr>
                        ))}
                        
                        {/* Total Row */}
                        <tr className="bg-[#1e3a8a] text-white print:bg-[#1e3a8a] print:text-white font-bold">
                            <td className="border border-slate-300 p-2"></td>
                            <td className="border border-slate-300 p-2 text-right uppercase">Total</td>
                            <td className="border border-slate-300 p-2 text-right">
                                {(totalTime / 60).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Signature Block */}
                <div className="border border-slate-800">
                    <div className="flex border-b border-slate-800 border-dotted">
                        <div className="w-[75%] p-3 font-bold text-center">Submitted by {reportConfig.submittedBy}</div>
                        <div className="w-[25%] border-l border-slate-800 p-3"></div>
                    </div>
                    <div className="flex">
                        <div className="w-[75%] p-3 font-bold text-center">Approved by</div>
                        <div className="w-[25%] border-l border-slate-800 p-3"></div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="print:hidden w-full max-w-4xl flex justify-center pb-8">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold shadow-xl shadow-slate-900/20 transition-all transform hover:-translate-y-1"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    <span>Print / Share PDF</span>
                </button>
            </div>

        </div>
      )}
    </div>
  );
};

// --- Sub-component for individual log entry row with expand on hover logic ---
const LogEntryRow: React.FC<{
    entry: TimesheetEntry;
    tasks: Task[];
    goals: Goal[];
    onUpdateEntry: (id: string, field: keyof TimesheetEntry, value: any) => void;
    onDeleteEntry: (id: string) => void;
    onCompleteTask: (task: Task) => void;
}> = ({ entry, tasks, goals, onUpdateEntry, onDeleteEntry, onCompleteTask }) => {
    
    // Determine related tasks for this entry
    // Matches by linkedGoalId OR category match (if multitasking)
    const relatedTasks = tasks.filter(t => 
        t.status !== TaskStatus.COMPLETED && (
            (entry.linkedGoalId && t.linkedGoalId === entry.linkedGoalId) ||
            (!entry.linkedGoalId && t.category === entry.category)
        )
    );

    return (
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-lg relative overflow-hidden">
            {/* Main Row Content */}
            <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10 bg-white dark:bg-slate-900">
                {/* Left: Date */}
                <div className="w-full md:w-20 flex-shrink-0 text-center md:text-left flex flex-col">
                    <input 
                        type="date"
                        value={entry.date}
                        onChange={(e) => onUpdateEntry(entry.id, 'date', e.target.value)}
                        className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full"
                    />
                    <span className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">{entry.source === 'PILE_UP' ? 'Internal' : 'Import'}</span>
                </div>

                {/* Middle: Main Inputs */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Title Input */}
                    <input 
                        type="text" 
                        value={entry.title}
                        onChange={(e) => onUpdateEntry(entry.id, 'title', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    
                    {/* Meta Controls */}
                    <div className="flex gap-2">
                        {/* Category Select */}
                        <select
                            value={entry.category}
                            onChange={(e) => onUpdateEntry(entry.id, 'category', e.target.value)}
                            className={`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-indigo-500 ${
                                entry.category === TaskCategory.LEISURE ? 'text-red-500' : 
                                entry.category === TaskCategory.RESEARCH ? 'text-orange-500' :
                                entry.category === TaskCategory.CREATION ? 'text-blue-500' :
                                entry.category === TaskCategory.LEARNING ? 'text-emerald-500' :
                                entry.category === TaskCategory.ACTIVITY ? 'text-yellow-500' :
                                entry.category === TaskCategory.FILE_SORTING ? 'text-gray-500' :
                                entry.category === TaskCategory.DOCUMENTATION ? 'text-cyan-500' :
                                'text-slate-500'
                            }`}
                        >
                            {Object.values(TaskCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Project Link Select */}
                        <select 
                            value={entry.linkedGoalId || ''}
                            onChange={(e) => onUpdateEntry(entry.id, 'linkedGoalId', e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">(Multitasking)</option>
                            {goals.map(g => (
                                <option key={g.id} value={g.id}>{g.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Right: Duration & Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="relative w-20">
                        <input 
                            type="number" 
                            min="0"
                            value={entry.durationMinutes}
                            onChange={(e) => onUpdateEntry(entry.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-6 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-right"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                    </div>
                    
                    <button 
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Item"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* EXPANDABLE SECTION FOR RELATED TASKS */}
            <div className="hidden group-hover:block border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 p-4 transition-all animate-fade-in origin-top">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Related Pending Objectives ({relatedTasks.length})
                    </h4>
                    {entry.notes && (
                        <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{entry.notes}</span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {relatedTasks.length === 0 ? (
                        <p className="text-xs text-slate-400 italic col-span-full">No related active objectives found for this context.</p>
                    ) : (
                        relatedTasks.map(task => (
                            <button
                                key={task.id}
                                onClick={() => onCompleteTask(task)}
                                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 group/task text-left transition-colors"
                            >
                                <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 group-hover/task:bg-emerald-500 group-hover/task:border-emerald-500 flex items-center justify-center transition-colors">
                                    <svg className="w-3 h-3 text-white opacity-0 group-hover/task:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{task.title}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Session Closure Modal ---
const SessionClosureModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    entries: TimesheetEntry[];
    tasks: Task[];
    goals: Goal[];
    onCompleteTask: (task: Task) => void;
    defaultGoalId?: string;
}> = ({ 
    isOpen, onClose, entries, tasks, goals, onCompleteTask, defaultGoalId 
}) => {
    // ... (rest of SessionClosureModal component remains identical to previous version)
    if (!isOpen) return null;

    const totalMinutes = entries.reduce((acc, e) => acc + e.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    const relevantTasks = tasks.filter(t => 
        t.status !== TaskStatus.COMPLETED && 
        (!defaultGoalId || t.linkedGoalId === defaultGoalId)
    );

    const projectTitle = defaultGoalId 
        ? goals.find(g => g.id === defaultGoalId)?.title 
        : 'General Activity';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
             <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Session Review</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            You logged <span className="font-bold text-indigo-500">{hours}h {minutes}m</span> for <span className="font-bold text-slate-700 dark:text-slate-300">{projectTitle}</span>.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Time Breakdown */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Activity Breakdown</h3>
                        <div className="space-y-2">
                            {entries.slice(0, 10).map(entry => (
                                <div key={entry.id} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-0">
                                    <span className="truncate text-slate-700 dark:text-slate-300 max-w-[70%]">{entry.title}</span>
                                    <span className="font-mono text-slate-500 text-xs">{entry.durationMinutes}m</span>
                                </div>
                            ))}
                            {entries.length > 10 && (
                                <p className="text-xs text-center text-slate-400 italic pt-2">...and {entries.length - 10} more entries</p>
                            )}
                        </div>
                    </div>

                    {/* Pending Tasks Checklist */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/30">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-indigo-100 dark:bg-indigo-500/20 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">Did you complete any tasks?</h3>
                        </div>

                        <div className="space-y-2">
                             {relevantTasks.length === 0 ? (
                                 <p className="text-sm text-slate-500 italic">No pending tasks found for this context.</p>
                             ) : (
                                relevantTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={() => onCompleteTask(task)}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900/30 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors group"
                                    >
                                        <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 group-hover:border-emerald-500 flex items-center justify-center transition-colors">
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{task.title}</p>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        Close Review
                    </button>
                </div>
             </div>
        </div>
    );
};

export default TimesheetView;
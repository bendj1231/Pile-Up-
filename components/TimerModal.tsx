import React, { useEffect, useState } from 'react';
import { Task, Subtask } from '../types';

interface TimerModalProps {
  task: Task;
  onClose: () => void;
  onComplete: (durationMinutes: number, isTaskDone: boolean, updatedSubtasks: Subtask[]) => void;
}

const TimerModal: React.FC<TimerModalProps> = ({ task, onClose, onComplete }) => {
  // State for the Setup Phase
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [setupHours, setSetupHours] = useState(Math.floor(task.plannedDurationMinutes / 60));
  const [setupMinutes, setSetupMinutes] = useState(task.plannedDurationMinutes % 60);

  // State for the Running Timer Phase
  const [timeLeft, setTimeLeft] = useState(task.plannedDurationMinutes * 60);
  const [initialDuration, setInitialDuration] = useState(task.plannedDurationMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Local state for subtasks to check off
  const [sessionSubtasks, setSessionSubtasks] = useState<Subtask[]>(
    task.subtasks.map(s => ({...s})) // Deep copy
  );

  useEffect(() => {
    let interval: any;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsReviewing(true); // Auto-trigger review when time is up
      
      // Notify user time is up
      if (Notification.permission === 'granted') {
        new Notification("Time's up!", { body: `Session finished for: ${task.title}` });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if(permission === 'granted') {
                 new Notification("Time's up!", { body: `Session finished for: ${task.title}` });
            }
        });
      }
      // Play a sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
      audio.play().catch(e => console.log('Audio play failed', e));
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, task.title]);

  const startTimer = () => {
    const totalSeconds = (setupHours * 3600) + (setupMinutes * 60);
    if (totalSeconds === 0) return; // Don't start if 0

    setInitialDuration(totalSeconds);
    setTimeLeft(totalSeconds);
    setIsSetupMode(false);
    setIsActive(true);
  };

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStopSession = () => {
    setIsActive(false);
    setIsReviewing(true);
  };

  const toggleSubtask = (id: string) => {
    setSessionSubtasks(prev => prev.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
  };

  const submitSession = (markParentComplete: boolean) => {
    // Calculate minutes spent (rounding up)
    const minutesSpent = Math.ceil(elapsed / 60);
    onComplete(minutesSpent, markParentComplete, sessionSubtasks);
  };

  const progress = ((initialDuration - timeLeft) / initialDuration) * 100;

  // --- VIEW: REVIEW SCREEN ---
  if (isReviewing) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                <div className="text-center mb-6 flex-shrink-0">
                    <div className="w-16 h-16 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                    <p className="text-slate-500 dark:text-slate-400">You focused for <span className="text-slate-900 dark:text-white font-bold">{Math.ceil(elapsed / 60)} minutes</span>.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex-shrink-0">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Main Task</h3>
                    <p className="text-lg text-slate-900 dark:text-white text-center font-medium truncate">{task.title}</p>
                </div>

                <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Completed Tasks</h3>
                    <div className="space-y-2">
                        {sessionSubtasks.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No specific objectives listed.</p>}
                        
                        {sessionSubtasks.map(sub => (
                            <label key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={sub.isCompleted}
                                    onChange={() => toggleSubtask(sub.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className={`text-sm ${sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {sub.title}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 flex-shrink-0">
                    <button
                        onClick={() => submitSession(false)}
                        className="w-full py-3 rounded-xl font-bold text-base bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all"
                    >
                        Save Progress (Keep Task Open)
                    </button>
                    
                    <button
                        onClick={() => submitSession(true)}
                        className="w-full py-3 rounded-xl font-bold text-base bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20 border border-emerald-600/20 transition-all"
                    >
                        Mark Main Task Complete
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --- VIEW: SETUP SCREEN ---
  if (isSetupMode) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 shadow-2xl animate-fade-in-up relative overflow-hidden">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                        <svg className="w-8 h-8 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Set Timer Duration</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">How long do you want to work on <br/><span className="text-slate-900 dark:text-white font-semibold">"{task.title}"</span>?</p>
                </div>

                {/* Duration Inputs */}
                <div className="flex items-center justify-center gap-4 mb-10">
                    <div className="flex flex-col items-center">
                        <input 
                            type="number" 
                            min="0"
                            max="24"
                            value={setupHours}
                            onChange={(e) => setSetupHours(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 h-20 text-center text-4xl font-bold bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Hours</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-300 dark:text-slate-600 pb-6">:</span>
                    <div className="flex flex-col items-center">
                        <input 
                            type="number" 
                            min="0"
                            max="59"
                            value={setupMinutes}
                            onChange={(e) => setSetupMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 h-20 text-center text-4xl font-bold bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                        />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Mins</span>
                    </div>
                </div>

                <button
                    onClick={startTimer}
                    disabled={setupHours === 0 && setupMinutes === 0}
                    className="w-full py-4 rounded-xl font-bold text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
                >
                    Start Session
                </button>
            </div>
        </div>
      );
  }

  // --- VIEW: RUNNING TIMER ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-8">
            <h2 className="text-slate-500 dark:text-slate-400 text-sm uppercase tracking-widest font-semibold mb-2 flex items-center justify-center gap-2">
              Current Focus
              <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full"></span>
              <span className="text-indigo-600 dark:text-indigo-400">{task.category}</span>
            </h2>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{task.title}</h3>
        </div>

        {/* Circular Timer Visual */}
        <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100 dark:text-slate-800"
                />
                <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                    className="text-indigo-500 transition-all duration-1000 ease-linear"
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-mono font-bold text-slate-900 dark:text-white tracking-tighter">
                    {formatTime(timeLeft)}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                    {isActive ? 'FOCUSING' : 'PAUSED'}
                </span>
            </div>
        </div>

        {/* Objectives Peek */}
        {task.subtasks.length > 0 && (
             <div className="mb-6 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{task.subtasks.filter(s => !s.isCompleted).length} Objectives Remaining</p>
             </div>
        )}

        <div className="flex gap-4">
            <button
                onClick={toggleTimer}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    isActive 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25'
                }`}
            >
                {isActive ? 'Pause' : 'Start Timer'}
            </button>
            
            <button
                onClick={handleStopSession}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-500 transition-all"
            >
                Finish Session
            </button>
        </div>

        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
};

export default TimerModal;
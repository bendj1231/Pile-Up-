

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum TaskCategory {
  RESEARCH = 'RESEARCH', // Orange
  CREATION = 'CREATION', // Blue
  LEARNING = 'LEARNING', // Green
  ACTIVITY = 'ACTIVITY', // Yellow
  LEISURE = 'LEISURE',   // Red
  FILE_SORTING = 'FILE_SORTING',
  DOCUMENTATION = 'DOCUMENTATION',
  OTHER = 'OTHER',
}

export enum GoalType {
  MONTHLY = 'MONTHLY',
  FORECAST = 'FORECAST',
}

export enum TimeOfDay {
  MORNING = 'Morning',
  AFTERNOON = 'Afternoon',
  EVENING = 'Evening',
  ANY = 'Any',
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  category?: TaskCategory; // Added to support color-coded objectives
  allocatedMinutes?: number; // Time budget for this specific subtask
  actualMinutes?: number; // Actual time spent on this subtask
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  subtasks: Subtask[]; // The 12 objectives for the session
  isBacklog: boolean; // Distinguishes between active list and "Bank"
  category: TaskCategory;
  plannedDurationMinutes: number; // The target time for the timer
  actualDurationMinutes: number; // Actual recorded time
  status: TaskStatus;
  linkedGoalId?: string; // Optional link to a larger goal
  createdAt: number;
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  deadline: string; // ISO Date string
  targetHours: number;
  loggedHours: number;
  description?: string;
  dailyTarget?: number; // Desired daily hours
  preferredTime?: TimeOfDay; // Preferred time of day to work
}

export interface AnalysisResult {
  message: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
  recommendation: string;
}

export interface TimerState {
  taskId: string | null;
  isRunning: boolean;
  timeLeft: number; // in seconds
  totalDuration: number; // in seconds, for progress calculation
  startTime: number | null;
}

// --- New Timesheet Types ---

export type TimesheetSource = 'PILE_UP' | 'SCREEN_MONITOR';

export interface TimesheetEntry {
  id: string;
  date: string; // ISO Date String YYYY-MM-DD
  title: string;
  category: TaskCategory;
  durationMinutes: number;
  source: TimesheetSource;
  notes?: string;
  rawSourceData?: string; // The raw line from the screen monitor log
  linkedGoalId?: string;
  linkedGoalTitle?: string;
}
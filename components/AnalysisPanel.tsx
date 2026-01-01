import React, { useState } from 'react';
import { AnalysisResult, Goal, Task } from '../types';
import { analyzeProgress } from '../services/geminiService';

interface AnalysisPanelProps {
  goals: Goal[];
  tasks: Task[];
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ goals, tasks }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeProgress(goals, tasks);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Progress Forecast
        </h2>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            loading
              ? 'bg-slate-100 dark:bg-slate-600 cursor-not-allowed text-slate-400'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          {loading ? 'Analyzing...' : 'Analyze Now'}
        </button>
      </div>

      {!analysis && !loading && (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Click analyze to let AI evaluate your velocity against your monthly goals and deadlines.
        </p>
      )}

      {analysis && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              analysis.status === 'ON_TRACK' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
              analysis.status === 'AT_RISK' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20' :
              'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
            }`}>
              {analysis.status.replace('_', ' ')}
            </div>
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">Forecast Status</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-indigo-600 dark:text-indigo-300 font-semibold mb-2 text-sm">Summary</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{analysis.message}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <h3 className="text-emerald-600 dark:text-emerald-300 font-semibold mb-2 text-sm">Action Plan</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">{analysis.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
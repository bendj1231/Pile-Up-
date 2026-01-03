import React, { useState } from 'react';
import { AnalysisResult, Goal, Task } from '../types';
import { analyzeProgress } from '../services/geminiService';
import CategoryDistributionChart from './CategoryDistributionChart';

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Progress & Focus Forecast
        </h2>
        
        {/* Only show refresh button in header when results are visible to avoid clutter */}
        {(analysis || loading) && (
            <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                loading
                ? 'bg-slate-100 dark:bg-slate-600 cursor-not-allowed text-slate-400'
                : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20'
            }`}
            >
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
        )}
      </div>

      <div className="min-h-[200px]">
        {/* Initial State: CTA */}
        {!analysis && !loading && (
             <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/50">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unlock Your Productivity Insights</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed mb-6">
                    Analyze your current velocity, get actionable feedback, and visualize your Focus Distribution chart.
                </p>
                <button
                    onClick={handleAnalyze}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
                >
                    Analyze Now
                </button>
             </div>
        )}

        {/* Loading State */}
        {loading && (
             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Analyzing tasks and calculating distribution...</p>
            </div>
        )}

        {/* Results State */}
        {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                {/* Left Column: AI Text Analysis */}
                <div className="lg:col-span-2 space-y-4">
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

                {/* Right Column: Embedded Chart - Only visible after analysis */}
                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-6 lg:pt-0 lg:pl-6">
                    <CategoryDistributionChart tasks={tasks} title="Focus Distribution" variant="clean" />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
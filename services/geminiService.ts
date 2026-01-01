import { GoogleGenAI, Type } from "@google/genai";
import { Goal, Task, AnalysisResult, TaskCategory } from "../types";

const processApiKey = process.env.API_KEY;

export const analyzeProgress = async (
  goals: Goal[],
  tasks: Task[]
): Promise<AnalysisResult> => {
  if (!processApiKey) {
    return {
      message: "API Key not configured.",
      status: "AT_RISK",
      recommendation: "Please configure your API key to get AI insights.",
    };
  }

  const ai = new GoogleGenAI({ apiKey: processApiKey });

  // Filter completed and pending tasks
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  const prompt = `
    Analyze the user's productivity progress based on the following data.
    
    Current Date: ${new Date().toLocaleDateString()}
    
    Goals:
    ${JSON.stringify(goals, null, 2)}
    
    Completed Tasks Log:
    ${JSON.stringify(
      completedTasks.map((t) => ({
        title: t.title,
        category: t.category,
        totalTimeSpent: t.actualDurationMinutes,
        date: new Date(t.createdAt).toLocaleDateString(),
        subtaskBreakdown: t.subtasks.map(s => `${s.title}: ${s.actualMinutes || 0}m used / ${s.allocatedMinutes || 0}m planned`),
        linkedGoalId: t.linkedGoalId
      })),
      null,
      2
    )}

    Pending Backlog (Buildup):
    ${JSON.stringify(
      pendingTasks.map((t) => ({
        title: t.title,
        category: t.category,
        plannedDuration: t.plannedDurationMinutes,
        timeSpentSoFar: t.actualDurationMinutes, // User has spent time but not finished!
        subtaskStatus: t.subtasks.map(s => `${s.title}: ${s.isCompleted ? 'Done' : 'Pending'} (${s.actualMinutes || 0}m spent)`),
        linkedGoalId: t.linkedGoalId
      })),
      null,
      2
    )}

    Task: Determine if the user is on track. 
    Crucial Logic: 
    1. Look at 'Pending Backlog'. If there are many tasks with 'timeSpentSoFar' > 0 but still pending, this indicates a "buildup" of incomplete work and slow progression.
    2. Compare 'targetHours' vs 'loggedHours' on goals.
    3. **Insight Analysis**: Look at the 'subtaskBreakdown'. If specific subtasks (e.g., "Algebra" vs "Fractions") take significantly longer than allocated, identify this as a weakness or area needing focus.
    
    Return a JSON object with:
    - message: A brief summary of their progress. Explicitly mention if tasks are piling up.
    - status: One of "ON_TRACK", "AT_RISK", "BEHIND".
    - recommendation: A specific, actionable tip. If you see they spent a lot of time on a specific subtask topic compared to others, mention it (e.g., "You spent 50m on Algebra but only allocated 20m. Consider revising Algebra basics.").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["ON_TRACK", "AT_RISK", "BEHIND"] },
            recommendation: { type: Type.STRING },
          },
          required: ["message", "status", "recommendation"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("AI Analysis Failed:", error);
    return {
      message: "Could not analyze progress at this time.",
      status: "AT_RISK",
      recommendation: "Check your internet connection or API quota.",
    };
  }
};

export const getTaskSuggestions = async (title: string): Promise<{ description: string; tags: string[]; category: TaskCategory }> => {
    if (!processApiKey) {
        return {
            description: "API Key missing.",
            tags: [],
            category: TaskCategory.OTHER
        };
    }
    
    const ai = new GoogleGenAI({ apiKey: processApiKey });

    const prompt = `
        For a task titled "${title}", suggest:
        1. A concise description (max 1 sentence).
        2. 3 relevant short keyword tags (topics).
        3. The most appropriate category from: RESEARCH, CREATION, LEARNING, OTHER.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        category: { type: Type.STRING, enum: Object.values(TaskCategory) }
                    },
                    required: ["description", "tags", "category"]
                }
            }
        });

        const text = response.text;
        if(!text) throw new Error("No response");
        return JSON.parse(text);
    } catch (e) {
        console.error("Suggestion failed", e);
        return {
            description: "",
            tags: [],
            category: TaskCategory.OTHER
        };
    }
};
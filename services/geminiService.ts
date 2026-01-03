import { GoogleGenAI, Type } from "@google/genai";
import { Goal, Task, AnalysisResult, TaskCategory, TimesheetEntry } from "../types";

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
        3. The most appropriate category from: RESEARCH, CREATION, LEARNING, ACTIVITY, LEISURE, OTHER.
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

export const categorizeTask = async (title: string): Promise<TaskCategory> => {
    if (!processApiKey) return TaskCategory.OTHER;
    if (!title || title.trim().length < 3) return TaskCategory.OTHER; // Skip short inputs to reduce errors

    const ai = new GoogleGenAI({ apiKey: processApiKey });
    
    const prompt = `
        Classify the task "${title}" into exactly one of these categories based on these specific rules:

        1. **ACTIVITY**: Any job or chore. 
           Examples: cleaning, cooking, organizing things, washing dishes, laundry.
        
        2. **LEISURE**: Fun, relaxation, or entertainment.
           Examples: gaming, golfing, playing games, gta 5, watching YouTube, watching movies.

        3. **LEARNING**: Acquiring new knowledge or skills.
           Examples: learn more about ai, learn how to do a new sport, try out cooking lessons, reading a textbook.

        4. **CREATION**: Building, making, or designing something new.
           Examples: ai development, prompts, prompt engineering, create a new app, create a book, create a new theme, painting, coding a feature.

        5. **RESEARCH**: Investigating, data gathering, or deep diving into a topic.
           Examples: I need to know more about pollution, research on my thesis, look up flight prices.

        6. **OTHER**: Anything that strictly does not fit above.

        Return ONLY the category word (e.g., "ACTIVITY", "LEISURE").
    `;

    try {
        const response = await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: prompt,
        });
        const text = response.text?.trim().toUpperCase();
        
        if (text?.includes('RESEARCH')) return TaskCategory.RESEARCH;
        if (text?.includes('CREATION')) return TaskCategory.CREATION;
        if (text?.includes('LEARNING')) return TaskCategory.LEARNING;
        if (text?.includes('ACTIVITY')) return TaskCategory.ACTIVITY;
        if (text?.includes('LEISURE')) return TaskCategory.LEISURE;
        
        return TaskCategory.OTHER;
    } catch (error) {
        console.warn("Categorization skipped due to error:", error);
        return TaskCategory.OTHER;
    }
};

export const processTimesheetData = async (
    rawData: string, 
    availableProjects: {id: string, title: string, description?: string}[] = [],
    targetProjectId?: string
): Promise<TimesheetEntry[]> => {
    if (!processApiKey || !rawData.trim()) return [];

    const ai = new GoogleGenAI({ apiKey: processApiKey });

    const targetProject = targetProjectId ? availableProjects.find(p => p.id === targetProjectId) : null;

    const prompt = `
        You are a data processing assistant. 
        I have raw data from a screen monitoring application or a rough text log of activities.
        
        Raw Data:
        "${rawData.substring(0, 15000)}"

        Here is a list of active Projects (Goals) the user is working on:
        ${JSON.stringify(availableProjects.map(p => ({id: p.id, title: p.title})))}

        ${targetProject ? `IMPORTANT CONTEXT: The user is specifically importing this data for the project: "${targetProject.title}". 
        Use this project as the primary context for ambiguous activities. 
        However, if an activity clearly belongs to a different project (e.g. explicitly named), link it to that one instead.` : ''}

        Task:
        1. Extract distinct activities/programs/websites.
        2. Estimate or parse the duration in minutes for each activity.
        3. Assign a Category (RESEARCH, CREATION, LEARNING, ACTIVITY, LEISURE, OTHER). 
           - NOTE: AI development, prompts, and coding should be CREATION.
        4. Correlate the activity to one of the provided Projects based on context.
        5. Clean up the Title.
        6. Assume the date is today (${new Date().toISOString().split('T')[0]}) unless specified otherwise.

        Return a JSON array of objects.
    `;

    try {
        // Enforce a 45-second timeout to prevent UI hanging
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 45000)
        );

        const apiPromise = ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            durationMinutes: { type: Type.NUMBER },
                            category: { type: Type.STRING, enum: Object.values(TaskCategory) },
                            date: { type: Type.STRING },
                            notes: { type: Type.STRING },
                            linkedGoalId: { type: Type.STRING }
                        },
                        required: ["title", "durationMinutes", "category", "date"] 
                    }
                }
            }
        });

        const response: any = await Promise.race([apiPromise, timeoutPromise]);

        let text = response.text;
        if (!text) return [];

        // Robust JSON extraction: Find the first '[' and last ']'
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        
        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        } else {
             console.warn("No JSON array found in response");
             return [];
        }

        const parsed = JSON.parse(text);
        
        // Map to TimesheetEntry structure
        return parsed.map((item: any) => {
            const linkedProject = availableProjects.find(p => p.id === item.linkedGoalId);
            return {
                id: Date.now().toString() + Math.random(),
                date: item.date,
                title: item.title,
                category: item.category,
                durationMinutes: item.durationMinutes,
                source: 'SCREEN_MONITOR',
                notes: item.notes,
                rawSourceData: rawData.substring(0, 50) + '...',
                linkedGoalId: item.linkedGoalId,
                linkedGoalTitle: linkedProject ? linkedProject.title : undefined
            };
        });

    } catch (error) {
        console.error("Timesheet processing failed:", error);
        return [];
    }
};
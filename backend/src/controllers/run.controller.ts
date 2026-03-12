import { Request, Response, NextFunction } from "express";
import db, {
  runs,
  prompts,
  aiEngines,
  projects,
  responses,
  citations,
} from "../db/index.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { AppError } from "../middleware/errorHandler.js";
import { addRunPromptJob } from "../services/queue.service";
import type { AuthRequest } from "../middleware/authenticate.js";

const projectsAlias = alias(projects, "project");
const promptsAlias = alias(prompts, "prompt");
const aiEnginesAlias = alias(aiEngines, "engine");

export const triggerRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { promptIds, engineIds } = req.body;
    console.log("--- triggerRun ---");
    console.log("userId:", userId);
    console.log("promptIds:", promptIds);
    console.log("engineIds:", engineIds);

    let promptsList;
    if (promptIds && promptIds.length > 0) {
      promptsList = await db
        .select({
          id: prompts.id,
          query: prompts.query,
          projectId: prompts.projectId,
        })
        .from(prompts)
        .innerJoin(projects, eq(prompts.projectId, projects.id))
        .where(
          and(
            eq(prompts.isActive, true),
            eq(projects.userId, userId),
            inArray(prompts.id, promptIds),
          ),
        );
    } else {
      promptsList = await db
        .select({
          id: prompts.id,
          query: prompts.query,
          projectId: prompts.projectId,
        })
        .from(prompts)
        .innerJoin(projects, eq(prompts.projectId, projects.id))
        .where(and(eq(prompts.isActive, true), eq(projects.userId, userId)));
    }

    let engines;
    if (engineIds && engineIds.length > 0) {
      engines = await db
        .select()
        .from(aiEngines)
        .where(
          and(eq(aiEngines.isActive, true), inArray(aiEngines.id, engineIds)),
        );
    } else {
      engines = await db
        .select()
        .from(aiEngines)
        .where(eq(aiEngines.isActive, true));
    }

    if (engines.length === 0) {
      throw new AppError("No valid engines found", 400);
    }

    const jobs = [];

    for (const prompt of promptsList) {
      for (const engine of engines) {
        const [run] = await db
          .insert(runs)
          .values({
            promptId: prompt.id,
            engineId: engine.id,
            status: "PENDING",
          })
          .returning();

        jobs.push(
          addRunPromptJob({
            runId: run.id,
            promptId: prompt.id,
            engineId: engine.id,
            prompt: prompt.query,
            engineName: engine.name,
          }),
        );
      }
    }

    await Promise.all(jobs);

    res.status(201).json({
      success: true,
      message: `Created ${jobs.length} jobs`,
      data: { jobsCreated: jobs.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getRuns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;

    const runsData = await db
      .select()
      .from(runs)
      .innerJoin(promptsAlias, eq(runs.promptId, promptsAlias.id))
      .innerJoin(projectsAlias, eq(promptsAlias.projectId, projectsAlias.id))
      .innerJoin(aiEnginesAlias, eq(runs.engineId, aiEnginesAlias.id))
      .where(eq(projectsAlias.userId, userId))
      .orderBy(desc(runs.createdAt))
      .limit(100);

    const runsList = runsData.map((r) => ({
      id: r.Run.id,
      promptId: r.Run.promptId,
      engineId: r.Run.engineId,
      status: r.Run.status,
      startedAt: r.Run.startedAt,
      finishedAt: r.Run.finishedAt,
      error: r.Run.error,
      createdAt: r.Run.createdAt,
      updatedAt: r.Run.updatedAt,
      prompt: {
        id: r.prompt.id,
        query: r.prompt.query,
        projectId: r.prompt.projectId,
        project: {
          id: r.project.id,
          userId: r.project.userId,
          domain: r.project.domain,
        },
      },
      engine: {
        id: r.engine.id,
        name: r.engine.name,
      },
    }));

    res.json({
      success: true,
      data: runsList,
    });
  } catch (error) {
    next(error);
  }
};

export const getRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const runData = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id as any));

    const run = runData[0];

    if (!run) {
      throw new AppError("Run not found", 404);
    }

    const promptData = await db
      .select()
      .from(promptsAlias)
      .innerJoin(projectsAlias, eq(promptsAlias.projectId, projectsAlias.id))
      .where(eq(promptsAlias.id, run.promptId as any));

    const prompt = promptData[0];

    if (!prompt || prompt.project.userId !== userId) {
      throw new AppError("Run not found", 404);
    }

    const engineData = await db
      .select()
      .from(aiEngines)
      .where(eq(aiEngines.id, run.engineId as any));
    const engine = engineData[0];

    const responseData = await db
      .select()
      .from(responses)
      .where(eq(responses.runId, run.id));

    const responseIds = responseData.map((r) => r.id);
    const citationsList =
      responseIds.length > 0
        ? await db
            .select()
            .from(citations)
            .where(inArray(citations.responseId, responseIds))
        : [];

    const responsesWithCitations = responseData.map((r) => ({
      ...r,
      citations: citationsList.filter((c) => c.responseId === r.id),
    }));

    res.json({
      success: true,
      data: {
        ...run,
        prompt: {
          id: prompt.prompt.id,
          query: prompt.prompt.query,
          projectId: prompt.prompt.projectId,
          project: {
            id: prompt.project.id,
            userId: prompt.project.userId,
            domain: prompt.project.domain,
          },
        },
        engine,
        responses: responsesWithCitations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectRunStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // First ensure user owns project
    const projectList = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId as string), eq(projects.userId, userId)),
      );
    if (projectList.length === 0) {
      throw new AppError("Project not found", 404);
    }

    // Find any PENDING or PROCESSING runs for this project
    const activeRuns = await db
      .select({
        id: runs.id,
      })
      .from(runs)
      .innerJoin(promptsAlias, eq(runs.promptId, promptsAlias.id))
      .where(
        and(
          eq(promptsAlias.projectId, projectId as string),
          inArray(runs.status, ["PENDING", "RUNNING"]),
        ),
      );

    res.json({
      success: true,
      data: {
        isRunning: activeRuns.length > 0,
        pendingCount: activeRuns.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

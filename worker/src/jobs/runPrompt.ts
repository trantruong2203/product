import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { getEngine } from '../engines/baseEngine.js';
import { parseResponse } from '../services/parser.service.js';

export interface RunPromptJobData {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}

export async function runPromptJob(job: Job<RunPromptJobData>): Promise<void> {
  const { runId, promptId, engineId, prompt, engineName } = job.data;

  console.log(`Processing run ${runId} for engine ${engineName}`);

  try {
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const engine = getEngine(engineName);
    await engine.initialize();

    const responseText = await engine.query(prompt);
    console.log(`Got response for run ${runId}, length: ${responseText.length}`);

    const response = await prisma.response.create({
      data: {
        runId,
        responseText,
        responseHtml: '',
      },
    });

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
      },
    });

    const project = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: { project: { include: { competitors: true } } },
    });

    if (project) {
      const competitorNames = project.project.competitors.map((c: { name: string }) => c.name);
      const competitorDomains = project.project.competitors.map((c: { domain: string }) => c.domain);

      await parseResponse({
        responseId: response.id,
        responseText,
        brandName: project.project.brandName,
        domain: project.project.domain,
        competitorNames,
        competitorDomains,
      });
    }

    await engine.cleanup();
    console.log(`Completed run ${runId}`);
  } catch (error) {
    console.error(`Error processing run ${runId}:`, error);

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

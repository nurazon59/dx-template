import type { Job, StepEntry } from "./types.js";
import { Suspend } from "./types.js";

const jobs = new Map<string, Job>();

export const jobStore = {
  create: (job: Job) => {
    jobs.set(job.jobId, job);
  },
  get: (jobId: string) => jobs.get(jobId) ?? null,
  updateStep: (jobId: string, step: string) => {
    const job = jobs.get(jobId);
    if (job) job.currentStep = step;
  },
  complete: (jobId: string, result: unknown) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "done";
      job.result = result;
    }
  },
  fail: (jobId: string, error: string) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "failed";
      job.error = error;
    }
  },
  suspend: (jobId: string, stepIndex: number, ctx: unknown) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "suspended";
      job.suspendedStepIndex = stepIndex;
      job.suspendedCtx = ctx;
    }
  },
};

export const createRunner =
  <TPayload, TResult>(steps: StepEntry[]) =>
  async (jobId: string, payload: TPayload): Promise<TResult> => {
    const job = jobStore.get(jobId);
    const startIndex = job?.suspendedStepIndex ?? 0;
    let ctx: unknown = job?.suspendedCtx ?? payload;

    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      jobStore.updateStep(jobId, step.name);
      try {
        ctx = await step.execute(ctx);
      } catch (e) {
        if (e instanceof Suspend) {
          jobStore.suspend(jobId, i + 1, ctx);
          return undefined as TResult;
        }
        jobStore.fail(jobId, String(e));
        throw e;
      }
    }

    jobStore.complete(jobId, ctx);
    return ctx as TResult;
  };

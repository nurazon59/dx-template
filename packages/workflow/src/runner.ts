import type { Job, PendingApprovalData, StepEntry } from "./types.js";
import { Suspend } from "./types.js";

const jobs = new Map<string, Job>();

export const jobStore = {
  create: (job: Job) => {
    const now = new Date().toISOString();
    jobs.set(job.jobId, {
      ...job,
      createdAt: job.createdAt || now,
      updatedAt: job.updatedAt || now,
    });
  },
  get: (jobId: string) => jobs.get(jobId) ?? null,
  updateStep: (jobId: string, step: string) => {
    const job = jobs.get(jobId);
    if (job) {
      job.currentStep = step;
      job.updatedAt = new Date().toISOString();
    }
  },
  complete: (jobId: string, result: unknown) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "done";
      job.result = result;
      job.updatedAt = new Date().toISOString();
    }
  },
  fail: (jobId: string, error: string) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "failed";
      job.error = error;
      job.updatedAt = new Date().toISOString();
    }
  },
  suspend: (jobId: string, stepIndex: number, ctx: unknown) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "suspended";
      job.suspendedStepIndex = stepIndex;
      job.suspendedCtx = ctx;
      job.updatedAt = new Date().toISOString();
    }
  },
  setPendingApproval: (jobId: string, data: PendingApprovalData) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "pending-approval";
      job.pendingApproval = data;
      job.updatedAt = new Date().toISOString();
    }
  },
  clearPendingApproval: (jobId: string) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "running";
      job.pendingApproval = undefined;
      job.updatedAt = new Date().toISOString();
    }
  },
  listByStatus: (status: Job["status"]) => {
    return Array.from(jobs.values()).filter((job) => job.status === status);
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

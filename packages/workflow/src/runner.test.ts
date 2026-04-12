import { describe, expect, it } from "vitest";
import { createRunner, jobStore } from "./runner.js";
import { Suspend } from "./types.js";
import type { StepEntry } from "./types.js";

describe("createRunner", () => {
  it("ステップを順に実行して結果を返す", async () => {
    const steps: StepEntry[] = [
      { name: "step1", execute: async (input: unknown) => ({ ...(input as object), step1: true }) },
      { name: "step2", execute: async (input: unknown) => ({ ...(input as object), step2: true }) },
    ];

    const jobId = crypto.randomUUID();
    jobStore.create({
      jobId,
      workflowType: "test",
      status: "running",
      currentStep: "",
      payload: { initial: true },
    });

    const result = await createRunner(steps)(jobId, { initial: true });
    expect(result).toEqual({ initial: true, step1: true, step2: true });

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
  });

  it("Suspend throw でジョブを中断し、再開できる", async () => {
    const steps: StepEntry[] = [
      {
        name: "collect",
        execute: async (input: unknown) => ({ ...(input as object), collected: true }),
      },
      {
        name: "approve",
        execute: async (input: unknown) => {
          if (!(input as { approved?: boolean }).approved) {
            throw new Suspend();
          }
          return { ...(input as object), approved: true };
        },
      },
      {
        name: "finalize",
        execute: async (input: unknown) => ({ ...(input as object), finalized: true }),
      },
    ];

    const jobId = crypto.randomUUID();
    jobStore.create({
      jobId,
      workflowType: "test",
      status: "running",
      currentStep: "",
      payload: { initial: true },
    });

    const run = createRunner(steps);

    // 初回実行: approve で中断
    await run(jobId, { initial: true });
    const suspended = jobStore.get(jobId);
    expect(suspended?.status).toBe("suspended");
    expect(suspended?.suspendedStepIndex).toBe(2);

    // 承認入力を注入して再開
    if (suspended?.suspendedCtx && typeof suspended.suspendedCtx === "object") {
      suspended.suspendedCtx = { ...suspended.suspendedCtx, approved: true };
    }
    suspended!.status = "running";
    const result = await run(jobId, suspended!.payload);
    expect(result).toEqual({ initial: true, collected: true, approved: true, finalized: true });
    expect(jobStore.get(jobId)?.status).toBe("done");
  });
});

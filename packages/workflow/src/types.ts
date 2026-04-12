export interface Workflow<TPayload, TResult> {
  run(payload: TPayload, context: WorkflowContext): Promise<TResult>;
}

export interface WorkflowContext {
  queries: Record<string, never>;
}

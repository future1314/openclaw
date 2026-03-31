import { getFlowById } from "./flow-registry.js";
import type { FlowRecord } from "./flow-registry.types.js";
import {
  appendFlowOutput,
  createFlow,
  emitFlowUpdate,
  failFlow,
  finishFlow,
  resumeFlow,
  runTaskInFlow,
  setFlowOutput,
  setFlowWaiting,
} from "./flow-runtime.js";
import { assertCallerAccessOwnedSession } from "./task-owner-access.js";

type CreateFlowParams = Parameters<typeof createFlow>[0];
type RunTaskInFlowParams = Omit<Parameters<typeof runTaskInFlow>[0], "callerSessionKey" | "flowId">;
type SetFlowWaitingParams = Omit<
  Parameters<typeof setFlowWaiting>[0],
  "callerSessionKey" | "flowId"
>;
type SetFlowOutputParams = Omit<Parameters<typeof setFlowOutput>[0], "callerSessionKey" | "flowId">;
type AppendFlowOutputParams = Omit<
  Parameters<typeof appendFlowOutput>[0],
  "callerSessionKey" | "flowId"
>;
type EmitFlowUpdateParams = Omit<
  Parameters<typeof emitFlowUpdate>[0],
  "callerSessionKey" | "flowId"
>;
type ResumeFlowParams = Omit<Parameters<typeof resumeFlow>[0], "callerSessionKey" | "flowId">;
type FinishFlowParams = Omit<Parameters<typeof finishFlow>[0], "callerSessionKey" | "flowId">;
type FailFlowParams = Omit<Parameters<typeof failFlow>[0], "callerSessionKey" | "flowId">;

export type FlowAuthoringHelper = {
  flowId: string;
  getFlow(): FlowRecord;
  runTask(params: RunTaskInFlowParams): ReturnType<typeof runTaskInFlow>;
  wait(params: SetFlowWaitingParams): ReturnType<typeof setFlowWaiting>;
  setOutput(params: SetFlowOutputParams): ReturnType<typeof setFlowOutput>;
  appendOutput(params: AppendFlowOutputParams): ReturnType<typeof appendFlowOutput>;
  emitUpdate(params: EmitFlowUpdateParams): ReturnType<typeof emitFlowUpdate>;
  resume(params?: ResumeFlowParams): ReturnType<typeof resumeFlow>;
  finish(params?: FinishFlowParams): ReturnType<typeof finishFlow>;
  fail(params?: FailFlowParams): ReturnType<typeof failFlow>;
};

function requireLinearFlow(flowId: string, callerSessionKey: string): FlowRecord {
  const flow = getFlowById(flowId);
  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }
  if (flow.shape !== "linear") {
    throw new Error(`Flow is not linear: ${flowId}`);
  }
  assertCallerAccessOwnedSession({
    callerSessionKey,
    ownerSessionKey: flow.ownerSessionKey,
    subject: "flow",
    subjectId: flowId,
  });
  return flow;
}

export function bindFlowAuthoringHelper(
  flowId: string,
  callerSessionKey: string,
): FlowAuthoringHelper {
  requireLinearFlow(flowId, callerSessionKey);
  return {
    flowId,
    getFlow() {
      return requireLinearFlow(flowId, callerSessionKey);
    },
    runTask(params) {
      return runTaskInFlow({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    wait(params) {
      return setFlowWaiting({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    setOutput(params) {
      return setFlowOutput({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    appendOutput(params) {
      return appendFlowOutput({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    emitUpdate(params) {
      return emitFlowUpdate({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    resume(params) {
      return resumeFlow({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    finish(params) {
      return finishFlow({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
    fail(params) {
      return failFlow({
        callerSessionKey,
        flowId,
        ...params,
      });
    },
  };
}

export function createFlowAuthoringHelper(params: CreateFlowParams): {
  flow: FlowRecord;
  helper: FlowAuthoringHelper;
} {
  const flow = createFlow(params);
  return {
    flow,
    helper: bindFlowAuthoringHelper(flow.flowId, flow.ownerSessionKey),
  };
}

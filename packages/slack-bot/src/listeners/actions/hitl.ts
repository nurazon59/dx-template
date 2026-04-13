import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from "@slack/bolt";
import { apiClient } from "../../api-client.js";

export async function hitlApprove({
  ack,
  respond,
  action,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> {
  await ack();
  const jobId = action.value!;

  try {
    const result = await apiClient.hitl.resolve(jobId, { approved: true });
    await respond({
      text: `承認しました: ${result.message}`,
      replace_original: true,
    });
  } catch (err) {
    console.error("HITL approve failed:", err);
    await respond({
      text: ":warning: 承認処理に失敗しました。",
      replace_original: false,
    });
  }
}

export async function hitlReject({
  ack,
  respond,
  action,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> {
  await ack();
  const jobId = action.value!;

  try {
    await apiClient.hitl.resolve(jobId, { approved: false });
    await respond({
      text: "拒否しました。",
      replace_original: true,
    });
  } catch (err) {
    console.error("HITL reject failed:", err);
    await respond({
      text: ":warning: 拒否処理に失敗しました。",
      replace_original: false,
    });
  }
}

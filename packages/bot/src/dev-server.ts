import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { ping } from "./listeners/commands/ping.js";
import { appMention } from "./listeners/events/app-mention.js";
import { buttonClick } from "./listeners/actions/button-click.js";

type CapturedResponse = {
  ack: boolean;
  responses: unknown[];
};

function createHarness() {
  const captured: CapturedResponse = { ack: false, responses: [] };
  const ack = async () => {
    captured.ack = true;
  };
  const respond = async (msg: unknown) => {
    captured.responses.push(msg);
  };
  const say = async (msg: unknown) => {
    captured.responses.push(msg);
  };
  return { captured, ack, respond, say };
}

// リスナー名 → 関数のマッピング
const commands: Record<string, (args: any) => Promise<void>> = {
  ping,
};

const events: Record<string, (args: any) => Promise<void>> = {
  "app-mention": appMention,
};

const actions: Record<string, (args: any) => Promise<void>> = {
  "button-click": buttonClick,
};

const app = new Hono();

app.post("/commands/:name", async (c) => {
  const name = c.req.param("name");
  const handler = commands[name];
  if (!handler) {
    return c.json({ error: `unknown command: ${name}` }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const { captured, ack, respond } = createHarness();

  await handler({ ack, respond, command: { text: "", ...body } });
  return c.json({ ack: captured.ack, responses: captured.responses });
});

app.post("/events/:name", async (c) => {
  const name = c.req.param("name");
  const handler = events[name];
  if (!handler) {
    return c.json({ error: `unknown event: ${name}` }, 404);
  }

  const body = await c.req.json().catch(() => ({ user: "U_LOCAL" }));
  const { captured, say } = createHarness();

  await handler({ event: { user: "U_LOCAL", ...body }, say });
  return c.json({ responses: captured.responses });
});

app.post("/actions/:name", async (c) => {
  const name = c.req.param("name");
  const handler = actions[name];
  if (!handler) {
    return c.json({ error: `unknown action: ${name}` }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const { captured, ack, respond } = createHarness();

  await handler({ ack, respond, body: { ...body } });
  return c.json({ ack: captured.ack, responses: captured.responses });
});

const PORT = 4000;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Dev harness running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log(`  POST /commands/:name   (${Object.keys(commands).join(", ")})`);
  console.log(`  POST /events/:name     (${Object.keys(events).join(", ")})`);
  console.log(`  POST /actions/:name    (${Object.keys(actions).join(", ")})`);
});

import { createServer } from "node:http";
import { ping } from "./listeners/commands/ping.js";
import { appHomeOpened } from "./listeners/events/app-home.js";
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
  const client = {
    views: {
      publish: async (msg: unknown) => {
        captured.responses.push(msg);
      },
    },
  };
  return { captured, ack, respond, say, client };
}

const commands: Record<string, (args: any) => Promise<void>> = {
  ping,
};

const events: Record<string, (args: any) => Promise<void>> = {
  app_home_opened: appHomeOpened,
  "app-home-opened": appHomeOpened,
  "app-mention": appMention,
};

const actions: Record<string, (args: any) => Promise<void>> = {
  "button-click": buttonClick,
};

function parseBody(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost`);
  const [, category, name] = url.pathname.split("/");

  if (req.method !== "POST" || !category || !name) {
    json(res, 404, { error: "not found" });
    return;
  }

  const registry: Record<string, Record<string, (args: any) => Promise<void>>> = {
    commands,
    events,
    actions,
  };

  const handlers = registry[category];
  const handler = handlers?.[name];
  if (!handler) {
    json(res, 404, { error: `unknown ${category}: ${name}` });
    return;
  }

  const body = await parseBody(req);
  const { captured, ack, respond, say, client } = createHarness();

  if (category === "commands") {
    await handler({ ack, respond, command: { text: "", ...body } });
    json(res, 200, { ack: captured.ack, responses: captured.responses });
  } else if (category === "events") {
    await handler({ event: { user: "U_LOCAL", ...body }, say, client });
    json(res, 200, { responses: captured.responses });
  } else {
    await handler({ ack, respond, body: { ...body } });
    json(res, 200, { ack: captured.ack, responses: captured.responses });
  }
});

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Dev harness running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log(`  POST /commands/:name   (${Object.keys(commands).join(", ")})`);
  console.log(`  POST /events/:name     (${Object.keys(events).join(", ")})`);
  console.log(`  POST /actions/:name    (${Object.keys(actions).join(", ")})`);
});

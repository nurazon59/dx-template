import { generateSpecs } from "hono-openapi";
import { app } from "../app.js";

const spec = await generateSpecs(app, {
  documentation: {
    openapi: "3.1.0",
    info: { title: "DX Template API", version: "1.0.0" },
  },
});

process.stdout.write(JSON.stringify(spec, null, 2));

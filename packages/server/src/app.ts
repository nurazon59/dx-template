import { Hono } from "hono";
import { routes } from "./routes/index.js";

const app = new Hono().route("/api", routes);

export type AppType = typeof app;

export { app };

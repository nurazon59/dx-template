import { app } from "./app.js";
import { registerListeners } from "./listeners/index.js";

registerListeners(app);

await app.start();
console.log("Bot is running!");

import "dotenv/config";
import { createApp } from "./app";
import { loadConfig } from "./config/env";

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`DNS subdomains UI listening on :${config.port}`);
});

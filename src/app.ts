import express, { Express } from "express";
import path from "path";
import { DnsRecordService } from "./application/dns-record-service";
import { Config } from "./config/env";
import { createOvhZoneRepository } from "./infrastructure/ovh/ovh-zone-repository";
import { errorHandler } from "./web/error-handler";
import { createRoutes } from "./web/routes";

export function createApp(config: Config): Express {
  const repository = createOvhZoneRepository(config);
  const service = new DnsRecordService(repository, config.defaultTarget);
  const app = express();

  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(createRoutes(service, config));
  app.use(errorHandler);

  return app;
}



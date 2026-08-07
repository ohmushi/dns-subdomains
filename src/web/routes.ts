import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { DnsRecordService } from "../application/dns-record-service";
import { Config } from "../config/env";
import { renderPage } from "./views/page";

export function createRoutes(
  service: DnsRecordService,
  config: Config,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const records = await service.listRecords();
      const message =
        typeof req.query.message === "string" ? req.query.message : undefined;

      res.send(
        renderPage({
          domain: config.domain,
          defaultTarget: config.defaultTarget,
          records,
          message,
        }),
      );
    }),
  );

  router.post(
    "/add",
    asyncHandler(async (req, res) => {
      const record = await service.addRecord(
        String(req.body.sub ?? ""),
        String(req.body.target ?? ""),
      );

      redirectWithMessage(
        res,
        `Ajouté : ${record.sub} → ${record.target}`,
      );
    }),
  );

  router.post(
    "/edit/:id",
    asyncHandler(async (req, res) => {
      await service.updateRecord(
        Number(req.params.id),
        String(req.body.sub ?? ""),
        String(req.body.target ?? ""),
      );

      redirectWithMessage(res, "Modifié.");
    }),
  );

  router.post(
    "/delete/:id",
    asyncHandler(async (req, res) => {
      await service.deleteRecord(Number(req.params.id));
      redirectWithMessage(res, "Supprimé.");
    }),
  );

  return router;
}

function redirectWithMessage(res: Response, message: string): void {
  res.redirect(`/?message=${encodeURIComponent(message)}`);
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}



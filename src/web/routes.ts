import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { DnsRecordService } from "../application/dns-record-service";
import { Config } from "../config/env";
import { ARecord } from "../domain/dns-record";
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
        `Ajouté : ${formatRecord(record)}`,
      );
    }),
  );

  router.post(
    "/edit/:id",
    asyncHandler(async (req, res) => {
      const change = await service.updateRecord(
        Number(req.params.id),
        String(req.body.sub ?? ""),
        String(req.body.target ?? ""),
      );

      redirectWithMessage(
        res,
        `Modifié : ${formatRecord(change.before)} → ${formatRecord(change.after)}`,
      );
    }),
  );

  router.post(
    "/delete/:id",
    asyncHandler(async (req, res) => {
      const deleted = await service.deleteRecord(Number(req.params.id));
      redirectWithMessage(res, `Supprimé : ${formatRecord(deleted)}`);
    }),
  );

  return router;
}

function formatRecord(record: Pick<ARecord, "sub" | "target">): string {
  return `${record.sub} [${record.target}]`;
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



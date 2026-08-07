import { ErrorRequestHandler } from "express";
import { ValidationError } from "../domain/dns-record";
import { renderErrorPage } from "./views/page";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  console.error(error);

  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ValidationError) {
    res.status(400).send(renderErrorPage(error.message));
    return;
  }

  res
    .status(500)
    .send(renderErrorPage("Impossible de terminer l'opération."));
};


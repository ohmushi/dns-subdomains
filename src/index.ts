import express, { Request, Response } from "express";
import createOvhClient from "@ovhcloud/node-ovh";

const DOMAIN = process.env.DOMAIN ?? "example.com";
const DEFAULT_TARGET = process.env.DEFAULT_TARGET ?? "203.0.113.10";

const client = createOvhClient({
  endpoint: process.env.OVH_ENDPOINT ?? "ovh-eu",
  appKey: process.env.OVH_APP_KEY ?? "",
  appSecret: process.env.OVH_APP_SECRET ?? "",
  consumerKey: process.env.OVH_CONSUMER_KEY ?? "",
});

interface ARecord {
  id: number;
  sub: string;
  target: string;
}

async function getRecords(): Promise<ARecord[]> {
  const ids: number[] = await client.requestPromised(
    "GET",
    `/domain/zone/${DOMAIN}/record`,
    { fieldType: "A" }
  );
  const records = await Promise.all(
    ids.map(async (id) => {
      const r = await client.requestPromised(
        "GET",
        `/domain/zone/${DOMAIN}/record/${id}`
      );
      return { id, sub: r.subDomain || "@", target: r.target as string };
    })
  );
  records.sort((a, b) => a.sub.localeCompare(b.sub));
  return records;
}

async function refreshZone(): Promise<void> {
  await client.requestPromised("POST", `/domain/zone/${DOMAIN}/refresh`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPage(records: ARecord[], message?: string): string {
  const rows = records.length
    ? records
        .map(
          (r) => `
      <div class="row">
        <span class="sub">${escapeHtml(r.sub)}</span>
        <form class="target-form" method="post" action="/edit/${r.id}">
          <input class="target-input" type="text" name="target" value="${escapeHtml(r.target)}">
          <button class="icon-btn" type="submit" aria-label="Enregistrer"><i class="ti ti-check"></i></button>
        </form>
        <form method="post" action="/delete/${r.id}"
              onsubmit="return confirm('Supprimer ${escapeHtml(r.sub)}.${DOMAIN} ?');">
          <button class="icon-btn danger" type="submit" aria-label="Supprimer"><i class="ti ti-trash"></i></button>
        </form>
      </div>`
        )
        .join("")
    : `<div class="empty">Aucun enregistrement A pour l'instant.</div>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${DOMAIN}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/2.44.0/iconfont/tabler-icons.min.css">
<style>
  body {
    font-family: -apple-system, "Inter", system-ui, sans-serif;
    background: #f6f6f4;
    color: #1a1a1a;
    max-width: 560px;
    margin: 48px auto;
    padding: 0 20px;
  }
  .card {
    background: #fff;
    border: 0.5px solid #dcdcd6;
    border-radius: 12px;
    padding: 1.25rem;
  }
  .domain { font-size: 13px; color: #6b6b66; margin: 0 0 12px; }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 0.5px solid #e5e5e0;
  }
  .row:last-of-type { border-bottom: none; }
  .sub { flex: 0 0 110px; font-size: 14px; }
  .target-form { flex: 1; display: flex; gap: 6px; margin: 0; }
  .target-input {
    flex: 1;
    font-size: 14px;
    padding: 6px 8px;
    border: 0.5px solid #dcdcd6;
    border-radius: 6px;
    background: #fafafa;
  }
  .target-input:focus { outline: 2px solid #7fa8f0; outline-offset: -1px; }
  .icon-btn {
    background: none;
    border: none;
    color: #8b8b85;
    cursor: pointer;
    padding: 4px;
    display: flex;
  }
  .icon-btn:hover { color: #1a1a1a; }
  .icon-btn.danger:hover { color: #d14343; }
  .add-row {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #dcdcd6;
  }
  .add-row input {
    padding: 8px 10px;
    border: 0.5px solid #dcdcd6;
    border-radius: 6px;
    font-size: 14px;
  }
  .add-row input[name=sub] { flex: 1; }
  .add-row input[name=target] { width: 140px; }
  .add-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #7fa8f0;
    color: #10141c;
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 14px;
    cursor: pointer;
  }
  .flash {
    font-size: 13px;
    color: #3d6ac9;
    background: #eef4ff;
    border: 0.5px solid #c7dbfb;
    padding: 8px 10px;
    border-radius: 6px;
    margin-bottom: 12px;
  }
  .empty { color: #8b8b85; font-size: 14px; padding: 12px 0; }
</style>
</head>
<body>
  <div class="card">
    <p class="domain">${DOMAIN}</p>
    ${message ? `<div class="flash">${escapeHtml(message)}</div>` : ""}
    ${rows}
    <form class="add-row" method="post" action="/add">
      <input type="text" name="sub" placeholder="sous-domaine" required>
      <input type="text" name="target" placeholder="${DEFAULT_TARGET}" value="${DEFAULT_TARGET}">
      <button class="add-btn" type="submit"><i class="ti ti-plus"></i>Ajouter</button>
    </form>
  </div>
</body>
</html>`;
}

const app = express();
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req: Request, res: Response) => {
  const records = await getRecords();
  const message = typeof req.query.message === "string" ? req.query.message : undefined;
  res.send(renderPage(records, message));
});

app.post("/add", async (req: Request, res: Response) => {
  const sub = String(req.body.sub ?? "").trim();
  const target = String(req.body.target ?? "").trim() || DEFAULT_TARGET;
  await client.requestPromised("POST", `/domain/zone/${DOMAIN}/record`, {
    fieldType: "A",
    subDomain: sub,
    target,
    ttl: 3600,
  });
  await refreshZone();
  res.redirect(`/?message=${encodeURIComponent(`Ajouté : ${sub}.${DOMAIN} → ${target}`)}`);
});

app.post("/edit/:id", async (req: Request, res: Response) => {
  const target = String(req.body.target ?? "").trim();
  await client.requestPromised("PUT", `/domain/zone/${DOMAIN}/record/${req.params.id}`, {
    target,
  });
  await refreshZone();
  res.redirect(`/?message=${encodeURIComponent("Modifié.")}`);
});

app.post("/delete/:id", async (req: Request, res: Response) => {
  await client.requestPromised("DELETE", `/domain/zone/${DOMAIN}/record/${req.params.id}`);
  await refreshZone();
  res.redirect(`/?message=${encodeURIComponent("Supprimé.")}`);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`DNS subdomains UI listening on :${port}`);
});

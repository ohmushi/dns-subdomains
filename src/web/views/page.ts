import { ARecord } from "../../domain/dns-record";
import { escapeHtml } from "./escape-html";

export interface PageViewModel {
  domain: string;
  defaultTarget: string;
  records: ARecord[];
  message?: string;
}

export function renderPage(model: PageViewModel): string {
  const domain = escapeHtml(model.domain);
  const defaultTarget = escapeHtml(model.defaultTarget);

  const rows = model.records.length
    ? model.records
        .map((record) => {
          const sub = escapeHtml(record.sub);
          const target = escapeHtml(record.target);
          const recordName = escapeHtml(
            record.sub === "@" ? model.domain : `${record.sub}.${model.domain}`,
          );

          return `
      <div class="row">
        <span class="sub">${sub}</span>
        <form class="target-form" method="post" action="/edit/${record.id}">
          <input class="target-input" type="text" name="target" value="${target}" autocomplete="off">
          <button class="icon-btn" type="submit" aria-label="Enregistrer"><i class="ti ti-check"></i></button>
        </form>
        <form method="post" action="/delete/${record.id}" data-confirm-delete="${recordName}">
          <button class="icon-btn danger" type="submit" aria-label="Supprimer"><i class="ti ti-trash"></i></button>
        </form>
      </div>`;
        })
        .join("")
    : `<div class="empty">Aucun enregistrement A pour l'instant.</div>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${domain}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css">
<link rel="stylesheet" href="/styles.css">
<script src="/scripts.js" defer></script>
</head>
<body>
  <main class="card">
    <p class="domain">${domain}</p>
    ${model.message ? `<div class="flash" role="status">${escapeHtml(model.message)}</div>` : ""}
    ${rows}
    <form class="add-row" method="post" action="/add">
      <input type="text" name="sub" placeholder="sous-domaine" maxlength="253" required>
      <input type="text" name="target" placeholder="${defaultTarget}" value="${defaultTarget}" autocomplete="off">
      <button class="add-btn" type="submit"><i class="ti ti-plus"></i>Ajouter</button>
    </form>
  </main>
</body>
</html>`;
}

export function renderErrorPage(message = "Une erreur est survenue."): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Erreur</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="card">
    <div class="flash error" role="alert">${escapeHtml(message)}</div>
    <a href="/">Retour à la liste</a>
  </main>
</body>
</html>`;
}



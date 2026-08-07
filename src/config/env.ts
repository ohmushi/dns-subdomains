export interface Config {
  domain: string;
  defaultTarget: string;
  ignoredSubdomains: string[];
  ovhEndpoint: string;
  ovhAppKey: string;
  ovhAppSecret: string;
  ovhConsumerKey: string;
  port: number;
}

export const DEFAULT_IGNORED_SUBDOMAINS = ["@", "*"] as const;

export function parseIgnoredSubdomains(value: string | undefined): string[] {
  if (value === undefined) {
    return [...DEFAULT_IGNORED_SUBDOMAINS];
  }

  return [
    ...new Set(
      value
        .split(",")
        .map((subdomain) => subdomain.trim())
        .filter(Boolean),
    ),
  ];
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }

  return value;
}

export function loadConfig(): Config {
  const port = Number(process.env.PORT ?? 3000);
  const defaultTarget = process.env.DEFAULT_TARGET?.trim() || "203.0.113.10";
  const ignoredSubdomains = parseIgnoredSubdomains(process.env.IGNORED_SUBDOMAINS);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("PORT doit être un entier compris entre 1 et 65535");
  }

  return {
    domain: requiredEnvironment("DOMAIN"),
    defaultTarget,
    ignoredSubdomains,
    ovhEndpoint: process.env.OVH_ENDPOINT?.trim() || "ovh-eu",
    ovhAppKey: requiredEnvironment("OVH_APP_KEY"),
    ovhAppSecret: requiredEnvironment("OVH_APP_SECRET"),
    ovhConsumerKey: requiredEnvironment("OVH_CONSUMER_KEY"),
    port,
  };
}


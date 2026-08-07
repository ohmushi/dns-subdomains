export interface Config {
  domain: string;
  defaultTarget: string;
  ovhEndpoint: string;
  ovhAppKey: string;
  ovhAppSecret: string;
  ovhConsumerKey: string;
  port: number;
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

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("PORT doit être un entier compris entre 1 et 65535");
  }

  return {
    domain: requiredEnvironment("DOMAIN"),
    defaultTarget,
    ovhEndpoint: process.env.OVH_ENDPOINT?.trim() || "ovh-eu",
    ovhAppKey: requiredEnvironment("OVH_APP_KEY"),
    ovhAppSecret: requiredEnvironment("OVH_APP_SECRET"),
    ovhConsumerKey: requiredEnvironment("OVH_CONSUMER_KEY"),
    port,
  };
}


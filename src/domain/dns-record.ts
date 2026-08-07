export interface ARecord {
  id: number;
  sub: string;
  target: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateSubDomain(value: string): string {
  const subDomain = value.trim();

  if (!subDomain) {
    throw new ValidationError("Le sous-domaine est obligatoire.");
  }

  if (subDomain === "@") {
    return subDomain;
  }

  const labels = subDomain.split(".");
  const validLabels = labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label),
  );

  if (subDomain.length > 253 || !validLabels) {
    throw new ValidationError("Le sous-domaine est invalide.");
  }

  return subDomain;
}

export function validateIpv4(value: string): string {
  const target = value.trim();
  const parts = target.split(".");

  const isValid =
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) {
        return false;
      }

      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    });

  if (!isValid) {
    throw new ValidationError("La cible doit être une adresse IPv4 valide.");
  }

  return target;
}



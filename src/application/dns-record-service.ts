import {
  ARecord,
  validateIpv4,
  validateSubDomain,
  ValidationError,
} from "../domain/dns-record";
import { ZoneRepository } from "../infrastructure/ovh/ovh-zone-repository";

const RECORD_TTL = 3600;

export class DnsRecordService {
  constructor(
    private readonly repository: ZoneRepository,
    private readonly defaultTarget: string,
    ignoredSubdomains: readonly string[] = [],
  ) {
    validateIpv4(defaultTarget);
    this.ignoredSubdomains = new Set(ignoredSubdomains);
  }

  private readonly ignoredSubdomains: ReadonlySet<string>;

  async listRecords(): Promise<ARecord[]> {
    const records = await this.repository.listARecords();
    return records.filter((record) => !this.ignoredSubdomains.has(record.sub));
  }

  async addRecord(
    sub: string,
    target?: string,
  ): Promise<{ sub: string; target: string }> {
    const validSub = validateSubDomain(sub);
    if (this.ignoredSubdomains.has(validSub)) {
      throw new ValidationError("Ce sous-domaine est réservé et ne peut pas être ajouté.");
    }
    const validTarget = validateIpv4(target?.trim() || this.defaultTarget);

    await this.repository.createARecord({
      sub: validSub,
      target: validTarget,
      ttl: RECORD_TTL,
    });
    await this.repository.refresh();

    return { sub: validSub, target: validTarget };
  }

  async updateRecord(id: number, sub: string, target: string): Promise<void> {
    this.validateId(id);
    const validSub = validateSubDomain(sub);
    if (this.ignoredSubdomains.has(validSub)) {
      throw new ValidationError("Ce sous-domaine est réservé et ne peut pas être modifié.");
    }
    const validTarget = validateIpv4(target);

    await this.repository.updateARecord(id, validSub, validTarget);
    await this.repository.refresh();
  }

  async deleteRecord(id: number): Promise<void> {
    this.validateId(id);

    await this.repository.deleteARecord(id);
    await this.repository.refresh();
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Identifiant d'enregistrement invalide.");
    }
  }
}




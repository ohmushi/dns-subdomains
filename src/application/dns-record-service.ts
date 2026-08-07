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
  ) {
    validateIpv4(defaultTarget);
  }

  listRecords(): Promise<ARecord[]> {
    return this.repository.listARecords();
  }

  async addRecord(
    sub: string,
    target?: string,
  ): Promise<{ sub: string; target: string }> {
    const validSub = validateSubDomain(sub);
    const validTarget = validateIpv4(target?.trim() || this.defaultTarget);

    await this.repository.createARecord({
      sub: validSub,
      target: validTarget,
      ttl: RECORD_TTL,
    });
    await this.repository.refresh();

    return { sub: validSub, target: validTarget };
  }

  async updateRecord(id: number, target: string): Promise<void> {
    this.validateId(id);
    const validTarget = validateIpv4(target);

    await this.repository.updateARecord(id, validTarget);
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




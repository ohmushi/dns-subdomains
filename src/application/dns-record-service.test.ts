import assert from "node:assert/strict";
import test from "node:test";
import { DnsRecordService } from "./dns-record-service";
import { ZoneRepository } from "../infrastructure/ovh/ovh-zone-repository";
import { ARecord } from "../domain/dns-record";

class FakeZoneRepository implements ZoneRepository {
  readonly calls: string[] = [];
  readonly records: ARecord[] = [];
  failNextMutation = false;

  async listARecords(): Promise<ARecord[]> {
    this.calls.push("list");
    return this.records;
  }

  async createARecord(input: {
    sub: string;
    target: string;
    ttl: number;
  }): Promise<void> {
    this.calls.push(`create:${input.sub}:${input.target}:${input.ttl}`);
    this.throwIfRequested();
  }

  async updateARecord(id: number, target: string): Promise<void> {
    this.calls.push(`update:${id}:${target}`);
    this.throwIfRequested();
  }

  async deleteARecord(id: number): Promise<void> {
    this.calls.push(`delete:${id}`);
    this.throwIfRequested();
  }

  async refresh(): Promise<void> {
    this.calls.push("refresh");
  }

  private throwIfRequested(): void {
    if (this.failNextMutation) {
      this.failNextMutation = false;
      throw new Error("mutation failed");
    }
  }
}

test("ajoute avec la cible par défaut puis rafraîchit la zone", async () => {
  const repository = new FakeZoneRepository();
  const service = new DnsRecordService(repository, "203.0.113.10");

  await service.addRecord(" api.v1 ", "");

  assert.deepEqual(repository.calls, [
    "create:api.v1:203.0.113.10:3600",
    "refresh",
  ]);
});

test("modifie et supprime un enregistrement avec un refresh après chaque mutation", async () => {
  const repository = new FakeZoneRepository();
  const service = new DnsRecordService(repository, "203.0.113.10");

  await service.updateRecord(12, "192.0.2.25");
  await service.deleteRecord(12);

  assert.deepEqual(repository.calls, [
    "update:12:192.0.2.25",
    "refresh",
    "delete:12",
    "refresh",
  ]);
});

test("refuse les entrées invalides avant tout appel au repository", async () => {
  const repository = new FakeZoneRepository();
  const service = new DnsRecordService(repository, "203.0.113.10");

  await assert.rejects(
    service.addRecord("invalid subdomain", "192.0.2.1"),
    /sous-domaine est invalide/,
  );
  await assert.rejects(
    service.addRecord("api", "999.0.2.1"),
    /adresse IPv4 valide/,
  );
  await assert.rejects(
    service.updateRecord(0, "192.0.2.1"),
    /Identifiant d'enregistrement invalide/,
  );
  await assert.rejects(
    service.updateRecord(1, ""),
    /adresse IPv4 valide/,
  );

  assert.deepEqual(repository.calls, []);
});

test("ne rafraîchit pas si la mutation OVH échoue", async () => {
  const repository = new FakeZoneRepository();
  repository.failNextMutation = true;
  const service = new DnsRecordService(repository, "203.0.113.10");

  await assert.rejects(service.deleteRecord(4), /mutation failed/);

  assert.deepEqual(repository.calls, ["delete:4"]);
});



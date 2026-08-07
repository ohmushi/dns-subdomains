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

  async getARecord(id: number): Promise<ARecord> {
    this.calls.push(`get:${id}`);
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record) {
      throw new Error("record not found");
    }
    return record;
  }

  async createARecord(input: {
    sub: string;
    target: string;
    ttl: number;
  }): Promise<void> {
    this.calls.push(`create:${input.sub}:${input.target}:${input.ttl}`);
    this.throwIfRequested();
  }

  async updateARecord(id: number, sub: string, target: string): Promise<void> {
    this.calls.push(`update:${id}:${sub}:${target}`);
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

test("filtre les sous-domaines ignorés sans modifier les données du repository", async () => {
  const repository = new FakeZoneRepository();
  repository.records.push(
    { id: 1, sub: "@", target: "192.0.2.1" },
    { id: 2, sub: "*", target: "192.0.2.2" },
    { id: 3, sub: "api", target: "192.0.2.3" },
  );
  const service = new DnsRecordService(repository, "203.0.113.10", ["@", "*"]);

  const records = await service.listRecords();

  assert.deepEqual(records, [
    { id: 3, sub: "api", target: "192.0.2.3" },
  ]);
  assert.equal(repository.records.length, 3);
});

test("utilise la liste ignorée configurée et refuse d'ajouter une entrée ignorée", async () => {
  const repository = new FakeZoneRepository();
  repository.records.push(
    { id: 1, sub: "internal", target: "192.0.2.1" },
    { id: 2, sub: "api", target: "192.0.2.2" },
  );
  const service = new DnsRecordService(repository, "203.0.113.10", ["internal"]);

  assert.deepEqual(await service.listRecords(), [
    { id: 2, sub: "api", target: "192.0.2.2" },
  ]);
  await assert.rejects(
    service.addRecord(" internal ", "192.0.2.3"),
    /sous-domaine est réservé/,
  );
  assert.deepEqual(repository.calls, ["list"]);
});

test("modifie et supprime un enregistrement avec un refresh après chaque mutation", async () => {
  const repository = new FakeZoneRepository();
  repository.records.push({ id: 12, sub: "api", target: "192.0.2.24" });
  const service = new DnsRecordService(repository, "203.0.113.10");

  const change = await service.updateRecord(12, " api.v1 ", "192.0.2.25");
  const deleted = await service.deleteRecord(12);

  assert.deepEqual(change, {
    before: { id: 12, sub: "api", target: "192.0.2.24" },
    after: { id: 12, sub: "api.v1", target: "192.0.2.25" },
  });
  assert.deepEqual(deleted, {
    id: 12,
    sub: "api",
    target: "192.0.2.24",
  });

  assert.deepEqual(repository.calls, [
    "get:12",
    "update:12:api.v1:192.0.2.25",
    "refresh",
    "get:12",
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
    service.updateRecord(0, "api", "192.0.2.1"),
    /Identifiant d'enregistrement invalide/,
  );
  await assert.rejects(
    service.updateRecord(1, "api", ""),
    /adresse IPv4 valide/,
  );

  assert.deepEqual(repository.calls, []);
});

test("refuse un sous-domaine invalide ou réservé avant toute modification", async () => {
  const repository = new FakeZoneRepository();
  const service = new DnsRecordService(repository, "203.0.113.10", ["internal"]);

  await assert.rejects(
    service.updateRecord(1, "invalid subdomain", "192.0.2.1"),
    /sous-domaine est invalide/,
  );
  await assert.rejects(
    service.updateRecord(1, " internal ", "192.0.2.1"),
    /sous-domaine est réservé/,
  );

  assert.deepEqual(repository.calls, []);
});

test("ne rafraîchit pas si la mutation OVH échoue", async () => {
  const repository = new FakeZoneRepository();
  repository.records.push({ id: 4, sub: "api", target: "192.0.2.1" });
  repository.failNextMutation = true;
  const service = new DnsRecordService(repository, "203.0.113.10");

  await assert.rejects(service.deleteRecord(4), /mutation failed/);

  assert.deepEqual(repository.calls, ["get:4", "delete:4"]);
});



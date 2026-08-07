import createOvhClient from "@ovhcloud/node-ovh";
import { Config } from "../../config/env";
import { ARecord } from "../../domain/dns-record";

export interface ZoneRepository {
  listARecords(): Promise<ARecord[]>;
  createARecord(input: {
    sub: string;
    target: string;
    ttl: number;
  }): Promise<void>;
  updateARecord(id: number, sub: string, target: string): Promise<void>;
  deleteARecord(id: number): Promise<void>;
  refresh(): Promise<void>;
}

export function createOvhZoneRepository(config: Config): ZoneRepository {
  const client = createOvhClient({
    endpoint: config.ovhEndpoint,
    appKey: config.ovhAppKey,
    appSecret: config.ovhAppSecret,
    consumerKey: config.ovhConsumerKey,
  });

  return new OvhZoneRepository(client, config.domain);
}

class OvhZoneRepository implements ZoneRepository {
  constructor(
    private readonly client: OvhClient,
    private readonly domain: string,
  ) {}

  async listARecords(): Promise<ARecord[]> {
    const ids = (await this.client.requestPromised(
      "GET",
      `/domain/zone/${this.domain}/record`,
      { fieldType: "A" },
    )) as number[];

    const records = await Promise.all(
      ids.map(async (id) => {
        const record = await this.client.requestPromised(
          "GET",
          `/domain/zone/${this.domain}/record/${id}`,
        );

        return {
          id,
          sub: typeof record.subDomain === "string" && record.subDomain
            ? record.subDomain
            : "@",
          target: String(record.target),
        };
      }),
    );

    records.sort((a, b) => a.sub.localeCompare(b.sub));
    return records;
  }

  async createARecord(input: {
    sub: string;
    target: string;
    ttl: number;
  }): Promise<void> {
    await this.client.requestPromised(
      "POST",
      `/domain/zone/${this.domain}/record`,
      {
        fieldType: "A",
        subDomain: input.sub,
        target: input.target,
        ttl: input.ttl,
      },
    );
  }

  async updateARecord(id: number, sub: string, target: string): Promise<void> {
    await this.client.requestPromised(
      "PUT",
      `/domain/zone/${this.domain}/record/${id}`,
      { subDomain: sub, target },
    );
  }

  async deleteARecord(id: number): Promise<void> {
    await this.client.requestPromised(
      "DELETE",
      `/domain/zone/${this.domain}/record/${id}`,
    );
  }

  async refresh(): Promise<void> {
    await this.client.requestPromised(
      "POST",
      `/domain/zone/${this.domain}/refresh`,
    );
  }
}

type OvhClient = ReturnType<typeof createOvhClient>;


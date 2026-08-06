declare module "@ovhcloud/node-ovh" {
  interface OvhClientOptions {
    endpoint: string;
    appKey: string;
    appSecret: string;
    consumerKey: string;
  }

  interface OvhClient {
    requestPromised(method: string, path: string, params?: Record<string, unknown>): Promise<any>;
  }

  function createClient(options: OvhClientOptions): OvhClient;
  export default createClient;
}

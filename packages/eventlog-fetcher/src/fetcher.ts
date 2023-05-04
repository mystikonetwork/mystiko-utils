import ethers from 'ethers';
import {
  createAxiosInstance,
  getDefaultScanApiBaseUrl,
  httpGetFetchEventLogs,
  ScanApiEventLogParams,
  wrapRequestParams,
} from './common';
import { DefaultRetryPolicy, RetryPolicy } from './retry';
import { AxiosInstance } from 'axios';

export interface EventLogFetcher {
  fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]>;
}

export class ScanApiEventLogFetcher implements EventLogFetcher {
  public readonly chainId: number;
  public readonly offset: number;
  public readonly scanApiBaseUrl: string;
  private readonly apiKey: string;
  private readonly axiosInstance: AxiosInstance;
  private readonly maxRequestsPerSecond: number;
  private lastRequestTime: number | null = null;
  private readonly retryPolicy: RetryPolicy;

  constructor(
    chainId: number,
    apiKey: string,
    scanApiBaseUrl?: string,
    offset = 1000,
    maxRequestsPerSecond = 5,
    retryPolicy?: RetryPolicy,
  ) {
    this.chainId = chainId;
    this.offset = offset;
    this.apiKey = apiKey;
    this.scanApiBaseUrl = scanApiBaseUrl ? scanApiBaseUrl : getDefaultScanApiBaseUrl(this.chainId);
    this.axiosInstance = createAxiosInstance(this.scanApiBaseUrl);
    this.maxRequestsPerSecond = maxRequestsPerSecond;
    this.retryPolicy = retryPolicy ? retryPolicy : new DefaultRetryPolicy();
  }

  async fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]> {
    const eventLogs: ethers.providers.Log[] = [];
    const page = 1;
    const currentRetryTime = 0;
    const params = wrapRequestParams(address, fromBlock, toBlock, page, this.offset, this.apiKey, topicId);
    return this.recurFetch(eventLogs, currentRetryTime, params);
  }

  private async recurFetch(
    eventLogs: ethers.providers.Log[],
    currentRetryTime: number,
    params: ScanApiEventLogParams,
  ): Promise<ethers.providers.Log[]> {
    await this.throttle();
    return httpGetFetchEventLogs(this.axiosInstance, params)
      .then((pageEvents) => {
        eventLogs = eventLogs.concat(pageEvents);
        if (pageEvents.length < this.offset) {
          return Promise.resolve(eventLogs);
        }
        params.page = params.page + 1;
        return this.recurFetch(eventLogs, currentRetryTime, params);
      })
      .catch((error: any) => {
        if (this.retryPolicy.isRetryable(error, currentRetryTime)) {
          return this.recurFetch(eventLogs, currentRetryTime + 1, params);
        }
        return Promise.reject(error);
      });
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    if (this.lastRequestTime === null) {
      this.lastRequestTime = now;
      return;
    }
    const sleepMs = 1000 / this.maxRequestsPerSecond;
    const executionTime = this.lastRequestTime + sleepMs;
    if (executionTime <= now) {
      this.lastRequestTime = now;
      return;
    }
    this.lastRequestTime = executionTime;
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), executionTime - now);
    });
  }
}

export class ProviderEventLogFetcher implements EventLogFetcher {
  private provider: ethers.providers.Provider;
  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  public resetProvider(provider: ethers.providers.Provider): ProviderEventLogFetcher {
    this.provider = provider;
    return this;
  }

  public getProvider(): ethers.providers.Provider {
    return this.provider;
  }

  async fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]> {
    return this.provider
      .getLogs({
        address: address,
        fromBlock,
        toBlock,
        topics: [topicId],
      })
      .then((events: ethers.providers.Log[]) => {
        return events;
      });
  }
}

export class FailoverEventLogFetcher implements EventLogFetcher {
  private scanApiFetcher: ScanApiEventLogFetcher;
  private providerFetcher: ProviderEventLogFetcher;

  constructor(
    chainId: number,
    apiKey: string,
    provider: ethers.providers.Provider,
    scanApiBaseUrl?: string,
    scanApiOffset?: number,
    maxRequestsPerSecond = 5,
    retryPolicy?: RetryPolicy,
  ) {
    this.scanApiFetcher = new ScanApiEventLogFetcher(
      chainId,
      apiKey,
      scanApiBaseUrl,
      scanApiOffset,
      maxRequestsPerSecond,
      retryPolicy,
    );
    this.providerFetcher = new ProviderEventLogFetcher(provider);
  }

  public resetProvider(provider: ethers.providers.Provider): FailoverEventLogFetcher {
    this.providerFetcher.resetProvider(provider);
    return this;
  }

  public getProvider(): ethers.providers.Provider {
    return this.providerFetcher.getProvider();
  }

  async fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]> {
    return this.scanApiFetcher.fetchEventLogs(address, fromBlock, toBlock, topicId).catch(() => {
      return this.providerFetcher.fetchEventLogs(address, fromBlock, toBlock, topicId);
    });
  }
}

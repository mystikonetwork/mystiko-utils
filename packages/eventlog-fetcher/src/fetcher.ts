import ethers from 'ethers';
import {
  createAxiosInstance,
  getScanApiBaseUrlByChainId,
  httpGetFetchEventLogs,
  ScanApiEventLogParams,
  wrapRequestParams,
} from './common';
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

  constructor(chainId: number, apiKey: string, offset = 1000) {
    this.chainId = chainId;
    this.offset = offset;
    this.apiKey = apiKey;
    this.scanApiBaseUrl = getScanApiBaseUrlByChainId(this.chainId);
    this.axiosInstance = createAxiosInstance(this.scanApiBaseUrl);
  }
  async fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]> {
    const eventLogs: ethers.providers.Log[] = [];
    const page = 1;
    const params = wrapRequestParams(address, fromBlock, toBlock, page, this.offset, this.apiKey, topicId);
    return this.recurFetch(eventLogs, params);
  }

  async recurFetch(
    eventLogs: ethers.providers.Log[],
    params: ScanApiEventLogParams,
  ): Promise<ethers.providers.Log[]> {
    return httpGetFetchEventLogs(this.axiosInstance, params).then((pageEvents) => {
      if (pageEvents.length == 0) {
        return Promise.resolve(eventLogs);
      }
      eventLogs = eventLogs.concat(pageEvents);
      params.page = params.page + 1;
      return this.recurFetch(eventLogs, params);
    });
  }
}

export class ProviderEventLogFetcher implements EventLogFetcher {
  public readonly provider: ethers.providers.BaseProvider;
  constructor(provider: ethers.providers.BaseProvider) {
    this.provider = provider;
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
  public readonly scanApiFetcher: ScanApiEventLogFetcher;
  public readonly providerFetcher: ProviderEventLogFetcher;

  constructor(
    chainId: number,
    apiKey: string,
    provider: ethers.providers.BaseProvider,
    scanApiOffset?: number,
  ) {
    this.scanApiFetcher = new ScanApiEventLogFetcher(chainId, apiKey, scanApiOffset);
    this.providerFetcher = new ProviderEventLogFetcher(provider);
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

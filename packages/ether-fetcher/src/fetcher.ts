import { BigNumber, ethers } from 'ethers';
import {
  createAxiosInstance,
  getDefaultScanApiBaseUrl,
  httpGetEtherProxy,
  httpGetFetchEventLogs,
  ScanApiEventLogParams,
  wrapRequestParams,
} from './common';
import { DefaultRetryPolicy, RetryPolicy } from './retry';
import { AxiosInstance } from 'axios';

export interface EtherFetcher {
  fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]>;

  ethCall(to: string, functionEncodedData: string, blockTag?: string | undefined): Promise<any>;

  getBlockNumber(): Promise<number>;

  getBlockByNumber(blockNumber: number): Promise<ethers.providers.Block>;

  getTransactionByHash(transactionHash: string): Promise<ethers.providers.TransactionResponse>;

  getTransactionReceipt(transactionHash: string): Promise<ethers.providers.TransactionReceipt>;
}

export type ScanApiEtherFetcherOptions = {
  chainId: number;
  apikey: string;
  scanApiBaseUrl?: string;
  offset?: number;
  maxRequestsPerSecond?: number;
  retryPolicy?: RetryPolicy;
};

export type ProviderEtherFetcherOptions = {
  provider: ethers.providers.Provider;
};

export type FailoverFetcherOptions = ScanApiEtherFetcherOptions & ProviderEtherFetcherOptions;

export class ScanApiEtherFetcher implements EtherFetcher {
  public readonly chainId: number;
  public readonly offset: number;
  public readonly scanApiBaseUrl: string;
  private readonly apiKey: string;
  private readonly axiosInstance: AxiosInstance;
  private readonly maxRequestsPerSecond: number;
  private lastRequestTime: number | null = null;
  private readonly retryPolicy: RetryPolicy;

  constructor(options: ScanApiEtherFetcherOptions) {
    this.chainId = options.chainId;
    this.offset = options.offset ? options.offset : 1000;
    this.apiKey = options.apikey;
    this.scanApiBaseUrl = options.scanApiBaseUrl
      ? options.scanApiBaseUrl
      : getDefaultScanApiBaseUrl(this.chainId);
    this.axiosInstance = createAxiosInstance(this.scanApiBaseUrl);
    this.maxRequestsPerSecond = options.maxRequestsPerSecond ? options.maxRequestsPerSecond : 5;
    this.retryPolicy = options.retryPolicy ? options.retryPolicy : new DefaultRetryPolicy();
  }

  public async jsonRpcProxy(paramsMap: Map<string, any>): Promise<any> {
    const currentRetryTime = 0;
    return this.jsonRpcProxyWithRetry(currentRetryTime, paramsMap).then((resp: any) => {
      return resp;
    });
  }

  private async jsonRpcProxyWithRetry(currentRetryTime: number, paramsMap: Map<string, any>): Promise<any> {
    await this.throttle();
    return httpGetEtherProxy(this.axiosInstance, paramsMap)
      .then((response: any) => {
        return response;
      })
      .catch((error: any) => {
        if (this.retryPolicy.isRetryable(error, currentRetryTime)) {
          return this.jsonRpcProxyWithRetry(currentRetryTime + 1, paramsMap);
        }
        return Promise.reject(error);
      });
  }

  public async ethCall(to: string, functionEncodedData: string, blockTag?: string | undefined): Promise<any> {
    const paramsMap = new Map();
    paramsMap.set('action', 'eth_call');
    paramsMap.set('to', to);
    paramsMap.set('data', functionEncodedData);
    paramsMap.set('tag', blockTag ? blockTag : 'latest');
    paramsMap.set('apikey', this.apiKey);
    return this.jsonRpcProxy(paramsMap);
  }

  public async getBlockNumber(): Promise<number> {
    const paramsMap = new Map();
    paramsMap.set('action', 'eth_blockNumber');
    paramsMap.set('apikey', this.apiKey);
    return this.jsonRpcProxy(paramsMap).then((blockNumber: number) => {
      return BigNumber.from(blockNumber).toNumber();
    });
  }

  public async getBlockByNumber(blockNumber: number): Promise<ethers.providers.Block> {
    const paramsMap = new Map();
    paramsMap.set('action', 'eth_getBlockByNumber');
    paramsMap.set('apikey', this.apiKey);
    paramsMap.set('tag', ethers.utils.hexValue(blockNumber));
    paramsMap.set('boolean', false);
    return this.jsonRpcProxy(paramsMap).then((block: ethers.providers.Block) => {
      return block;
    });
  }

  public async getTransactionByHash(transactionHash: string): Promise<ethers.providers.TransactionResponse> {
    const paramsMap = new Map();
    paramsMap.set('action', 'eth_getTransactionByHash');
    paramsMap.set('apikey', this.apiKey);
    paramsMap.set('txhash', transactionHash);
    return this.jsonRpcProxy(paramsMap).then((txResponse: ethers.providers.TransactionResponse) => {
      return txResponse;
    });
  }

  public async getTransactionReceipt(transactionHash: string): Promise<ethers.providers.TransactionReceipt> {
    const paramsMap = new Map();
    paramsMap.set('action', 'eth_getTransactionReceipt');
    paramsMap.set('apikey', this.apiKey);
    paramsMap.set('txhash', transactionHash);
    return this.jsonRpcProxy(paramsMap).then((txReceipt: ethers.providers.TransactionReceipt) => {
      return txReceipt;
    });
  }

  public async fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]> {
    const eventLogs: ethers.providers.Log[] = [];
    const page = 1;
    const currentRetryTime = 0;
    const params = wrapRequestParams(address, fromBlock, toBlock, page, this.offset, this.apiKey, topicId);
    return this.recurFetchEventLogs(eventLogs, currentRetryTime, params);
  }

  private async recurFetchEventLogs(
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
        return this.recurFetchEventLogs(eventLogs, currentRetryTime, params);
      })
      .catch((error: any) => {
        if (this.retryPolicy.isRetryable(error, currentRetryTime)) {
          return this.recurFetchEventLogs(eventLogs, currentRetryTime + 1, params);
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

export class ProviderEtherFetcher implements EtherFetcher {
  private provider: ethers.providers.Provider;
  constructor(options: ProviderEtherFetcherOptions) {
    this.provider = options.provider;
  }

  public async ethCall(to: string, functionEncodedData: string, blockTag?: string | undefined): Promise<any> {
    return this.provider.call(
      {
        to: to,
        data: functionEncodedData,
      },
      blockTag ? blockTag : 'latest',
    );
  }

  public async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber().then((blockNumber: number) => {
      return BigNumber.from(blockNumber).toNumber();
    });
  }

  public async getBlockByNumber(blockNumber: number): Promise<ethers.providers.Block> {
    return this.provider.getBlock(BigNumber.from(blockNumber).toNumber());
  }

  public async getTransactionByHash(transactionHash: string): Promise<ethers.providers.TransactionResponse> {
    return this.provider.getTransaction(transactionHash);
  }

  public async getTransactionReceipt(transactionHash: string): Promise<ethers.providers.TransactionReceipt> {
    return this.provider.getTransactionReceipt(transactionHash);
  }

  public resetProvider(provider: ethers.providers.Provider): ProviderEtherFetcher {
    this.provider = provider;
    return this;
  }

  public getProvider(): ethers.providers.Provider {
    return this.provider;
  }

  public async fetchEventLogs(
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

export class FailoverEtherFetcher implements EtherFetcher {
  private scanApiFetcher: ScanApiEtherFetcher;
  private providerFetcher: ProviderEtherFetcher;

  constructor(options: FailoverFetcherOptions) {
    this.scanApiFetcher = new ScanApiEtherFetcher({
      chainId: options.chainId,
      apikey: options.apikey,
      scanApiBaseUrl: options.scanApiBaseUrl,
      offset: options.offset,
      maxRequestsPerSecond: options.maxRequestsPerSecond,
      retryPolicy: options.retryPolicy,
    });
    this.providerFetcher = new ProviderEtherFetcher({
      provider: options.provider,
    });
  }

  public async getBlockNumber(): Promise<number> {
    return this.scanApiFetcher
      .getBlockNumber()
      .then((blockNumber: number) => {
        return BigNumber.from(blockNumber).toNumber();
      })
      .catch(async () => {
        return this.providerFetcher.getBlockNumber().then((blockNumber: number) => {
          return BigNumber.from(blockNumber).toNumber();
        });
      });
  }

  public async getBlockByNumber(blockNumber: number): Promise<ethers.providers.Block> {
    return this.scanApiFetcher.getBlockByNumber(blockNumber).catch(() => {
      return this.providerFetcher.getBlockByNumber(blockNumber);
    });
  }

  public async getTransactionByHash(transactionHash: string): Promise<ethers.providers.TransactionResponse> {
    return this.scanApiFetcher.getTransactionByHash(transactionHash).catch(() => {
      return this.providerFetcher.getTransactionByHash(transactionHash);
    });
  }

  public async getTransactionReceipt(transactionHash: string): Promise<ethers.providers.TransactionReceipt> {
    return this.scanApiFetcher.getTransactionReceipt(transactionHash).catch(() => {
      return this.providerFetcher.getTransactionReceipt(transactionHash);
    });
  }

  public resetProvider(provider: ethers.providers.Provider): FailoverEtherFetcher {
    this.providerFetcher.resetProvider(provider);
    return this;
  }

  public getProvider(): ethers.providers.Provider {
    return this.providerFetcher.getProvider();
  }

  public async fetchEventLogs(
    address: string,
    fromBlock: number,
    toBlock: number,
    topicId: string,
  ): Promise<ethers.providers.Log[]> {
    return this.scanApiFetcher.fetchEventLogs(address, fromBlock, toBlock, topicId).catch(() => {
      return this.providerFetcher.fetchEventLogs(address, fromBlock, toBlock, topicId);
    });
  }

  public async ethCall(to: string, functionEncodedData: string, blockTag?: string | undefined): Promise<any> {
    return this.scanApiFetcher.ethCall(to, functionEncodedData, blockTag).catch(() => {
      return this.providerFetcher.ethCall(to, functionEncodedData, blockTag);
    });
  }
}

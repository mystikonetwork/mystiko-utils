import {
  EventLogFetcher,
  FailoverEventLogFetcher,
  ProviderEventLogFetcher,
  ScanApiEventLogFetcher,
} from './fetcher';
import { ethers } from 'ethers';

export type ScanApiEventLogFetcherOptions = {
  chainId: number;
  apikey: string;
  offset?: number;
};

export type ProviderEventLogFetcherOptions = {
  provider: ethers.providers.BaseProvider;
};

export type EventLogFetcherOptions = ScanApiEventLogFetcherOptions | ProviderEventLogFetcherOptions;

export type FailoverFetcherOptions = ScanApiEventLogFetcherOptions & ProviderEventLogFetcherOptions;

export interface EventLogFetcherFactory {
  create(options: EventLogFetcherOptions): EventLogFetcher;
}

export class ScanApiEventLogFetcherFactory implements EventLogFetcherFactory {
  public create(options: ScanApiEventLogFetcherOptions): ScanApiEventLogFetcher {
    return new ScanApiEventLogFetcher(options.chainId, options.apikey, options.offset);
  }
}

export class ProviderEventLogFetcherFactory implements EventLogFetcherFactory {
  public create(options: ProviderEventLogFetcherOptions): ProviderEventLogFetcher {
    return new ProviderEventLogFetcher(options.provider);
  }
}

export class FailoverEventLogFetcherFactory implements EventLogFetcherFactory {
  public create(options: FailoverFetcherOptions): FailoverEventLogFetcher {
    return new FailoverEventLogFetcher(options.chainId, options.apikey, options.provider, options.offset);
  }
}

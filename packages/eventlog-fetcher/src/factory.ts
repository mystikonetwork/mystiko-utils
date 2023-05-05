import {
  EventLogFetcher,
  FailoverEventLogFetcher,
  FailoverFetcherOptions,
  ProviderEventLogFetcher,
  ProviderEventLogFetcherOptions,
  ScanApiEventLogFetcher,
  ScanApiEventLogFetcherOptions,
} from './fetcher';

export type EventLogFetcherOptions = ScanApiEventLogFetcherOptions | ProviderEventLogFetcherOptions;

export interface EventLogFetcherFactory {
  create(options: EventLogFetcherOptions): EventLogFetcher;
}

export class ScanApiEventLogFetcherFactory implements EventLogFetcherFactory {
  public create(options: ScanApiEventLogFetcherOptions): ScanApiEventLogFetcher {
    return new ScanApiEventLogFetcher({
      chainId: options.chainId,
      apikey: options.apikey,
      scanApiBaseUrl: options.scanApiBaseUrl,
      offset: options.offset,
      maxRequestsPerSecond: options.maxRequestsPerSecond,
      retryPolicy: options.retryPolicy,
    });
  }
}

export class ProviderEventLogFetcherFactory implements EventLogFetcherFactory {
  public create(options: ProviderEventLogFetcherOptions): ProviderEventLogFetcher {
    return new ProviderEventLogFetcher({
      provider: options.provider,
    });
  }
}

export class FailoverEventLogFetcherFactory implements EventLogFetcherFactory {
  public create(options: FailoverFetcherOptions): FailoverEventLogFetcher {
    return new FailoverEventLogFetcher({
      chainId: options.chainId,
      apikey: options.apikey,
      scanApiBaseUrl: options.scanApiBaseUrl,
      offset: options.offset,
      maxRequestsPerSecond: options.maxRequestsPerSecond,
      retryPolicy: options.retryPolicy,
      provider: options.provider,
    });
  }
}

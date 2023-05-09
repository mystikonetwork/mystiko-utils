import {
  EtherFetcher,
  FailoverEtherFetcher,
  FailoverFetcherOptions,
  ProviderEtherFetcher,
  ProviderEtherFetcherOptions,
  ScanApiEtherFetcher,
  ScanApiEtherFetcherOptions,
} from './fetcher';

export type EtherFetcherOptions = ScanApiEtherFetcherOptions | ProviderEtherFetcherOptions;

export interface EtherFetcherFactory {
  create(options: EtherFetcherOptions): EtherFetcher;
}

export class ScanApiEtherFetcherFactory implements EtherFetcherFactory {
  public create(options: ScanApiEtherFetcherOptions): ScanApiEtherFetcher {
    return new ScanApiEtherFetcher({
      chainId: options.chainId,
      apikey: options.apikey,
      scanApiBaseUrl: options.scanApiBaseUrl,
      offset: options.offset,
      maxRequestsPerSecond: options.maxRequestsPerSecond,
      retryPolicy: options.retryPolicy,
    });
  }
}

export class ProviderEtherFetcherFactory implements EtherFetcherFactory {
  public create(options: ProviderEtherFetcherOptions): ProviderEtherFetcher {
    return new ProviderEtherFetcher({
      provider: options.provider,
    });
  }
}

export class FailoverEtherFetcherFactory implements EtherFetcherFactory {
  public create(options: FailoverFetcherOptions): FailoverEtherFetcher {
    return new FailoverEtherFetcher({
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

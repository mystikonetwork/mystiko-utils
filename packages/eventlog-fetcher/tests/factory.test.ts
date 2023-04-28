import {
  DEFAULT_MAINNET_BSC_API_BASE_URL,
  FailoverEventLogFetcherFactory,
  ProviderEventLogFetcherFactory,
  ScanApiEventLogFetcherFactory,
} from '../src';
import { ethers } from 'ethers';

describe('test factorys', () => {
  test('test create ScanApiEventLogFetcher', async () => {
    const chainId = 56;
    const apikey = 'TEST_API_KEY';
    const offset = 1000;
    const factory = new ScanApiEventLogFetcherFactory();
    const fetcher = factory.create({ chainId, apikey, offset });
    expect(fetcher.scanApiBaseUrl).toBe(DEFAULT_MAINNET_BSC_API_BASE_URL);
    expect(fetcher.chainId).toBe(chainId);
    expect(fetcher.offset).toBe(offset);
    const scanApiBaseUrl = 'http://localhost:30123';
    const fetcher2 = factory.create({ chainId, apikey, scanApiBaseUrl, offset });
    expect(fetcher2.scanApiBaseUrl).toBe(scanApiBaseUrl);
    expect(fetcher2.chainId).toBe(chainId);
    expect(fetcher2.offset).toBe(offset);
  });

  test('test create ProviderEventLogFetcher', async () => {
    const provider = new ethers.providers.JsonRpcProvider('https://test-provider.com');
    const factory = new ProviderEventLogFetcherFactory();
    const fetcher = factory.create({ provider });
    expect(fetcher.getProvider()).toBe(provider);
  });

  test('test create FailoverEventLogFetcher', async () => {
    const chainId = 56;
    const apikey = 'TEST_API_KEY';
    const offset = 1000;
    const provider = new ethers.providers.JsonRpcProvider('https://test-provider.com');
    const factory = new FailoverEventLogFetcherFactory();
    const fetcher = factory.create({ chainId, apikey, provider, offset });
    expect(fetcher.getProvider()).toBe(provider);
  });
});

import {
  DEFAULT_MAINNET_BSC_API_BASE_URL,
  FailoverEtherFetcherFactory,
  ProviderEtherFetcherFactory,
  ScanApiEtherFetcherFactory,
} from '../src';
import { ethers } from 'ethers';

describe('test factorys', () => {
  test('test create ScanApiEtherFetcher', async () => {
    const chainId = 56;
    const apikey = 'TEST_API_KEY';
    const offset = 1000;
    const factory = new ScanApiEtherFetcherFactory();
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

  test('test create ProviderEtherFetcher', async () => {
    const provider = new ethers.providers.JsonRpcProvider('https://test-provider.com');
    const factory = new ProviderEtherFetcherFactory();
    const fetcher = factory.create({ provider });
    expect(fetcher.getProvider()).toBe(provider);
  });

  test('test create FailoverEtherFetcher', async () => {
    const chainId = 56;
    const apikey = 'TEST_API_KEY';
    const offset = 1000;
    const provider = new ethers.providers.JsonRpcProvider('https://test-provider.com');
    const factory = new FailoverEtherFetcherFactory();
    const fetcher = factory.create({ chainId, apikey, provider, offset });
    expect(fetcher.getProvider()).toBe(provider);
  });
});

import {
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
    expect(fetcher.chainId).toBe(chainId);
    expect(fetcher.offset).toBe(offset);
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

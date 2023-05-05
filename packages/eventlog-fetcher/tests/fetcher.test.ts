import {
  DEFAULT_MAINNET_ETHER_API_BASE_URL,
  DefaultRetryPolicy,
  FailoverEventLogFetcher,
  ProviderEventLogFetcher,
  ScanApiEventLogFetcher,
} from '../src';
import { ethers } from 'ethers';
import nock from 'nock';

jest.setTimeout(20000);

class TestProvider extends ethers.providers.BaseProvider {
  constructor(chainId: number, chainName: string, network?: ethers.providers.Network) {
    super(network || Promise.resolve({ chainId, name: chainName }));
  }

  public getLogs(): Promise<ethers.providers.Log[]> {
    const logs: ethers.providers.Log[] = [
      {
        blockNumber: 1000,
        blockHash: '0x111',
        transactionIndex: 1,
        removed: true,
        address: '0x123',
        data: '0x00000',
        topics: ['0x111', '0x222'],
        transactionHash: '0x123',
        logIndex: 10,
      },
      {
        blockNumber: 2000,
        blockHash: '0x222',
        transactionIndex: 2,
        removed: false,
        address: '0x456',
        data: '0x1111',
        topics: ['0x333', '0x444'],
        transactionHash: '0x456',
        logIndex: 20,
      },
    ];
    return Promise.resolve(logs);
  }
}

describe('test fetchers', () => {
  const address = '0x111';
  const fromBlock = 10000;
  const toBlock = 20000;
  const page = 1;
  const offset = 2;
  const apikey = 'SADDA';
  const topic0 = '0xbbb';
  const mockedEvents = [
    {
      blockNumber: 1000,
      blockHash: 0x111,
      transactionIndex: 1,
      removed: true,
      address: 0x123,
      data: 0x00000,
      topics: ['0x111', '0x222'],
      transactionHash: '0x123',
      logIndex: 10,
    },
    {
      blockNumber: 2000,
      blockHash: 0x222,
      transactionIndex: 2,
      removed: false,
      address: 0x456,
      data: 0x1111,
      topics: ['0x333', '0x444'],
      transactionHash: '0x456',
      logIndex: 20,
    },
  ];
  it('test ScanApiEventLogFetcher', async () => {
    nock('http://localhost:1111')
      .get('/api')
      .query({ module: 'logs', action: 'getLogs', address, fromBlock, toBlock, topic0, page, offset, apikey })
      .reply(200, {
        status: '1',
        message: 'OK',
        result: mockedEvents,
      });
    nock('http://localhost:1111')
      .get('/api')
      .query({
        module: 'logs',
        action: 'getLogs',
        address,
        fromBlock,
        toBlock,
        topic0,
        page: page + 1,
        offset,
        apikey,
      })
      .reply(200, {
        status: '0',
        message: 'NO RECORD',
        result: [],
      });
    const scanApiEventLogFetcher = new ScanApiEventLogFetcher({
      chainId: 1,
      apikey,
      scanApiBaseUrl: 'http://localhost:1111',
      offset: 2,
    });
    const events = await scanApiEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(events.length).toEqual(mockedEvents.length);
  });

  it('test ScanApiEventLogFetcher constructor', async () => {
    const scanApiEventLogFetcher = new ScanApiEventLogFetcher({
      chainId: 1,
      apikey,
    });
    expect(scanApiEventLogFetcher.chainId).toEqual(1);
    expect(scanApiEventLogFetcher.scanApiBaseUrl).toEqual(DEFAULT_MAINNET_ETHER_API_BASE_URL);
    const test_base_url = 'http://localhost:30123';
    const retryPolicy = new DefaultRetryPolicy();
    const scanApiEventLogFetcher2 = new ScanApiEventLogFetcher({
      chainId: 56,
      apikey,
      scanApiBaseUrl: test_base_url,
      retryPolicy: retryPolicy,
    });
    expect(scanApiEventLogFetcher2.chainId).toEqual(56);
    expect(scanApiEventLogFetcher2.scanApiBaseUrl).toEqual(test_base_url);
  });

  it('test ScanApiEventLogFetcher retry', async () => {
    const data = {
      status: '0',
      message: 'NO RECORD',
      result: 'Max rate limit reached, please use API Key for higher rate limit',
    };
    nock('http://localhost:2222')
      .get('/api')
      .times(12)
      .query({
        module: 'logs',
        action: 'getLogs',
        address,
        fromBlock,
        toBlock,
        topic0,
        page: page,
        offset,
        apikey,
      })
      .reply(200, data);
    const scanApiEventLogFetcher = new ScanApiEventLogFetcher({
      chainId: 1,
      apikey,
      scanApiBaseUrl: 'http://localhost:2222',
      offset: 2,
      maxRequestsPerSecond: 5,
    });
    await expect(
      async () => await scanApiEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toEqual(data);
    // mock http response with delay
    nock('http://localhost:3333')
      .get('/api')
      .delay(500)
      .times(3)
      .query({
        module: 'logs',
        action: 'getLogs',
        address,
        fromBlock,
        toBlock,
        topic0,
        page: page,
        offset,
        apikey,
      })
      .reply(200, data);
    const scanApiEventLogFetcher2 = new ScanApiEventLogFetcher({
      chainId: 1,
      apikey,
      scanApiBaseUrl: 'http://localhost:3333',
      offset: 2,
      maxRequestsPerSecond: 5,
      retryPolicy: new DefaultRetryPolicy(2),
    });
    await expect(
      async () => await scanApiEventLogFetcher2.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toEqual(data);
  });

  it('test ProviderEventLogFetcher', async () => {
    const address = '0x1234567890';
    const fromBlock = 0;
    const toBlock = 100;
    const topicId = '0x9876543210';
    const provider = new TestProvider(1, 'chain 1');
    const fetcher = new ProviderEventLogFetcher({ provider });
    expect(fetcher.getProvider()).toBe(provider);
    const logs = await fetcher.fetchEventLogs(address, fromBlock, toBlock, topicId);
    expect(logs.length).toEqual(2);
    const provider2 = new TestProvider(2, 'chain 2');
    fetcher.resetProvider(provider2);
    expect(fetcher.getProvider()).toBe(provider2);
  });

  it('test FailoverEventLogFetcher', async () => {
    nock('http://localhost:3333')
      .get('/api')
      .times(3)
      .query({
        module: 'logs',
        action: 'getLogs',
        address,
        fromBlock,
        toBlock,
        topic0,
        page: page,
        offset,
        apikey,
      })
      .reply(200, mockedEvents);
    const provider = new TestProvider(1, 'chain 1');
    const failoverEventLogFetcher = new FailoverEventLogFetcher({
      chainId: 1,
      apikey,
      provider,
      scanApiBaseUrl: 'http://localhost:3333',
    });
    const eventLogs = await failoverEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(eventLogs.length).toEqual(2);
    const failoverEventLogFetcher2 = new FailoverEventLogFetcher({
      chainId: 56,
      apikey,
      provider,
      scanApiBaseUrl: 'http://localhost:3333',
    });
    const eventLogs2 = await failoverEventLogFetcher2.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(eventLogs2.length).toEqual(2);
    const provider2 = new TestProvider(2, 'chain 2');
    failoverEventLogFetcher.resetProvider(provider2);
    expect(failoverEventLogFetcher.getProvider()).toBe(provider2);
  });
});

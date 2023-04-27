import { FailoverEventLogFetcher, ProviderEventLogFetcher, ScanApiEventLogFetcher } from '../src';
import { ethers } from 'ethers';
import nock from 'nock';

jest.setTimeout(20000);

describe('test fetchers', () => {
  const address = '0x111';
  const fromBlock = 10000;
  const toBlock = 20000;
  const page = 1;
  const offset = 1000;
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
  beforeEach(() => {
    nock('https://api.etherscan.io')
      .get('/api')
      .query({ module: 'logs', action: 'getLogs', address, fromBlock, toBlock, topic0, page, offset, apikey })
      .reply(200, {
        status: '1',
        message: 'OK',
        result: mockedEvents,
      });
    nock('https://api.etherscan.io')
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
  });
  it('test ScanApiEventLogFetcher', async () => {
    const scanApiEventLogFetcher = new ScanApiEventLogFetcher(1, apikey);
    const events = await scanApiEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(events.length).toEqual(mockedEvents.length);
  });

  it('test ProviderEventLogFetcher', async () => {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:39737');
    const providerEventLogFetcher = new ProviderEventLogFetcher(provider);
    await expect(
      async () => await providerEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toThrow();
  });

  it('test FailoverEventLogFetcher', async () => {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:39737');
    const providerEventLogFetcher = new ProviderEventLogFetcher(provider);
    await expect(
      async () => await providerEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toThrow();
    const failoverEventLogFetcher = new FailoverEventLogFetcher(1, apikey, provider);
    const eventLogs = await failoverEventLogFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(eventLogs.length).toEqual(mockedEvents.length);
    const failoverEventLogFetcher2 = new FailoverEventLogFetcher(56, apikey, provider);
    await expect(
      async () => await failoverEventLogFetcher2.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toThrow();
  });
});

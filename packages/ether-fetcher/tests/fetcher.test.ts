import {
  DEFAULT_MAINNET_ETHER_API_BASE_URL,
  DefaultRetryPolicy,
  FailoverEtherFetcher,
  ProviderEtherFetcher,
  ScanApiEtherFetcher,
  wrapParamsQueryString,
} from '../src';
import { BigNumber, ethers } from 'ethers';
import nock from 'nock';

jest.setTimeout(25000);

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

  public async getBlockNumber(): Promise<number> {
    return Promise.resolve(10556486);
  }

  public async getBlock(blockNumber: number): Promise<any> {
    return Promise.resolve({
      difficulty: '0x2',
      number: blockNumber,
      parentHash: '0xe0121a8b0f6a27',
      timestamp: '0x60ed8b1a',
    });
  }

  public async getTransaction(txHash: string): Promise<any> {
    return Promise.resolve({
      hash: txHash,
      blockNumber: '0xbce938',
      from: '0x05e8b4714bcfa7adc4b1f16e81aa2152c7ac0a8f',
      gas: '0x8fa2',
    });
  }

  public async getTransactionReceipt(txHash: string): Promise<any> {
    return Promise.resolve({
      transactionHash: txHash,
      blockHash: '0xc5210ce45b8ba326b4e42761d23e541e52a3306e13953ed638236d95e60f416a',
      status: '0x1',
    });
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
  const mockedBlockNumber = 10556486;
  const getBlockNumberParams = new Map<string, any>();
  getBlockNumberParams.set('action', 'eth_blockNumber');
  getBlockNumberParams.set('apikey', apikey);
  getBlockNumberParams.set('module', 'proxy');
  const getBlocknumberQueryString = wrapParamsQueryString(getBlockNumberParams);

  const getBlockByNumberParams = new Map<string, any>();
  getBlockByNumberParams.set('action', 'eth_getBlockByNumber');
  getBlockByNumberParams.set('apikey', apikey);
  getBlockByNumberParams.set('tag', ethers.utils.hexValue(mockedBlockNumber));
  getBlockByNumberParams.set('boolean', false);
  getBlockByNumberParams.set('module', 'proxy');
  const getBlockByNumberQueryString = wrapParamsQueryString(getBlockByNumberParams);
  const mockedBlockResp = {
    jsonrpc: '2.0',
    id: 1,
    result: {
      difficulty: '0x2',
      number: '0xa11446',
      parentHash: '0xe0121a8b0f6a27',
      timestamp: '0x60ed8b1a',
    },
  };

  const getTransactionByHashParams = new Map<string, any>();
  getTransactionByHashParams.set('action', 'eth_getTransactionByHash');
  getTransactionByHashParams.set('apikey', apikey);
  getTransactionByHashParams.set('txhash', '0x111');
  getTransactionByHashParams.set('module', 'proxy');
  const getTransactionByHashQueryString = wrapParamsQueryString(getTransactionByHashParams);
  const mockedTransactionResp = {
    jsonrpc: '2.0',
    id: 1,
    result: {
      blockHash: '0x7f4f2a929c8cf13e91656451013da5d827035b72b50cb06d792116e23848b7a4',
      blockNumber: '0xbce938',
      from: '0x05e8b4714bcfa7adc4b1f16e81aa2152c7ac0a8f',
      gas: '0x8fa2',
    },
  };

  const getTransactionReceiptParams = new Map<string, any>();
  getTransactionReceiptParams.set('action', 'eth_getTransactionReceipt');
  getTransactionReceiptParams.set('apikey', apikey);
  getTransactionReceiptParams.set('txhash', '0x111');
  getTransactionReceiptParams.set('module', 'proxy');
  const getTransactionReceiptQueryString = wrapParamsQueryString(getTransactionReceiptParams);
  const mockedTransactionReceiptResp = {
    jsonrpc: '2.0',
    id: 1,
    result: {
      blockHash: '0xc5210ce45b8ba326b4e42761d23e541e52a3306e13953ed638236d95e60f416a',
      status: '0x1',
    },
  };

  it('test ScanApiEtherFetcher', async () => {
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
    const scanApiEtherFetcher = new ScanApiEtherFetcher({
      chainId: 1,
      apikey,
      scanApiBaseUrl: 'http://localhost:1111',
      offset: 2,
    });
    const events = await scanApiEtherFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(events.length).toEqual(mockedEvents.length);
    // test getBlockNumber
    nock('http://localhost:1111')
      .get(`/api?${getBlocknumberQueryString}`)
      .reply(200, {
        jsonrpc: '2.0',
        id: 83,
        result: BigNumber.from(mockedBlockNumber).toHexString(),
      });
    const blockNumber = await scanApiEtherFetcher.getBlockNumber();
    expect(blockNumber).toEqual(mockedBlockNumber);
    // test getBlockByNumber
    nock('http://localhost:1111').get(`/api?${getBlockByNumberQueryString}`).reply(200, mockedBlockResp);
    const blockResp = await scanApiEtherFetcher.getBlockByNumber(mockedBlockNumber);
    expect(blockResp).toEqual(mockedBlockResp.result);
    // test getTransactionByHash
    nock('http://localhost:1111')
      .get(`/api?${getTransactionByHashQueryString}`)
      .reply(200, mockedTransactionResp);
    const transactionResp = await scanApiEtherFetcher.getTransactionByHash('0x111');
    expect(transactionResp).toEqual(mockedTransactionResp.result);
    // test getTransactionReceipt
    nock('http://localhost:1111')
      .get(`/api?${getTransactionReceiptQueryString}`)
      .reply(200, mockedTransactionReceiptResp);
    const transactionReceiptResp = await scanApiEtherFetcher.getTransactionReceipt('0x111');
    expect(transactionReceiptResp).toEqual(mockedTransactionReceiptResp.result);
  });

  it('test ScanApiEtherFetcher constructor', async () => {
    const scanApiEtherFetcher = new ScanApiEtherFetcher({
      chainId: 1,
      apikey,
    });
    expect(scanApiEtherFetcher.chainId).toEqual(1);
    expect(scanApiEtherFetcher.scanApiBaseUrl).toEqual(DEFAULT_MAINNET_ETHER_API_BASE_URL);
    const test_base_url = 'http://localhost:30123';
    const retryPolicy = new DefaultRetryPolicy();
    const scanApiEtherFetcher2 = new ScanApiEtherFetcher({
      chainId: 56,
      apikey,
      scanApiBaseUrl: test_base_url,
      retryPolicy: retryPolicy,
    });
    expect(scanApiEtherFetcher2.chainId).toEqual(56);
    expect(scanApiEtherFetcher2.scanApiBaseUrl).toEqual(test_base_url);
  });

  it('test ScanApiEtherFetcher retry', async () => {
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
    const scanApiEtherFetcher = new ScanApiEtherFetcher({
      chainId: 1,
      apikey,
      scanApiBaseUrl: 'http://localhost:2222',
      offset: 2,
      maxRequestsPerSecond: 5,
    });
    await expect(
      async () => await scanApiEtherFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toEqual(data);
    // mock with ethcall retry
    nock('http://localhost:2222')
      .get('/api')
      .times(6)
      .query({
        module: 'proxy',
        action: 'eth_blockNumber',
        apikey,
      })
      .reply(200, data);
    await expect(async () => await scanApiEtherFetcher.getBlockNumber()).rejects.toEqual(data);
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
    const scanApiEtherFetcher2 = new ScanApiEtherFetcher({
      chainId: 1,
      apikey,
      scanApiBaseUrl: 'http://localhost:3333',
      offset: 2,
      maxRequestsPerSecond: 5,
      retryPolicy: new DefaultRetryPolicy(2),
    });
    await expect(
      async () => await scanApiEtherFetcher2.fetchEventLogs(address, fromBlock, toBlock, topic0),
    ).rejects.toEqual(data);
  });

  it('test ProviderEtherFetcher', async () => {
    const address = '0x1234567890';
    const fromBlock = 0;
    const toBlock = 100;
    const topicId = '0x9876543210';
    const provider = new TestProvider(1, 'chain 1');
    const fetcher = new ProviderEtherFetcher({ provider });
    expect(fetcher.getProvider()).toBe(provider);
    const logs = await fetcher.fetchEventLogs(address, fromBlock, toBlock, topicId);
    expect(logs.length).toEqual(2);
    const provider2 = new TestProvider(2, 'chain 2');
    fetcher.resetProvider(provider2);
    expect(fetcher.getProvider()).toBe(provider2);
    const blockNumber = await fetcher.getBlockNumber();
    expect(blockNumber).toEqual(mockedBlockNumber);
    const block = await fetcher.getBlockByNumber(mockedBlockNumber);
    expect(block.number).toEqual(mockedBlockNumber);
    const transaction = await fetcher.getTransactionByHash('0x111');
    expect(transaction.hash).toEqual('0x111');
    const transactionReceipt = await fetcher.getTransactionReceipt('0x111');
    expect(transactionReceipt.transactionHash).toEqual('0x111');
  });

  it('test FailoverEtherFetcher', async () => {
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
    nock('http://localhost:3333')
      .get(`/api?${getBlocknumberQueryString}`)
      .reply(200, {
        jsonrpc: '2.0',
        id: 83,
        result: BigNumber.from(mockedBlockNumber).toHexString(),
      });
    nock('http://localhost:3333').get(`/api?${getBlockByNumberQueryString}`).reply(200, mockedBlockResp);
    nock('http://localhost:3333')
      .get(`/api?${getTransactionByHashQueryString}`)
      .reply(200, mockedTransactionResp);
    nock('http://localhost:3333')
      .get(`/api?${getTransactionReceiptQueryString}`)
      .reply(200, mockedTransactionReceiptResp);

    const provider = new TestProvider(1, 'chain 1');
    const failoverEtherFetcher = new FailoverEtherFetcher({
      chainId: 1,
      apikey,
      provider,
      scanApiBaseUrl: 'http://localhost:3333',
    });
    const eventLogs = await failoverEtherFetcher.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(eventLogs.length).toEqual(2);
    let blockNumber = await failoverEtherFetcher.getBlockNumber();
    expect(blockNumber).toEqual(mockedBlockNumber);
    let block = await failoverEtherFetcher.getBlockByNumber(mockedBlockNumber);
    expect(block.number).toEqual(BigNumber.from(mockedBlockNumber).toHexString());
    let transactionResp = await failoverEtherFetcher.getTransactionByHash('0x111');
    expect(transactionResp).toEqual(mockedTransactionResp.result);
    let transactionReceiptResp = await failoverEtherFetcher.getTransactionReceipt('0x111');
    expect(transactionReceiptResp).toEqual(mockedTransactionReceiptResp.result);
    // test scan api error and failover to provder
    const failoverEtherFetcher2 = new FailoverEtherFetcher({
      chainId: 56,
      apikey,
      provider,
      scanApiBaseUrl: 'http://localhost:3333',
    });
    const eventLogs2 = await failoverEtherFetcher2.fetchEventLogs(address, fromBlock, toBlock, topic0);
    expect(eventLogs2.length).toEqual(2);
    blockNumber = await failoverEtherFetcher2.getBlockNumber();
    expect(blockNumber).toEqual(mockedBlockNumber);
    block = await failoverEtherFetcher2.getBlockByNumber(mockedBlockNumber);
    expect(block.number).toEqual(mockedBlockNumber);
    transactionResp = await failoverEtherFetcher2.getTransactionByHash('0x111');
    expect(transactionResp.hash).toEqual('0x111');
    transactionReceiptResp = await failoverEtherFetcher2.getTransactionReceipt('0x111');
    expect(transactionReceiptResp.transactionHash).toEqual('0x111');
    const provider2 = new TestProvider(2, 'chain 2');
    failoverEtherFetcher.resetProvider(provider2);
    expect(failoverEtherFetcher.getProvider()).toBe(provider2);
  });
});

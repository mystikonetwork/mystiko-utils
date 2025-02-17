import {
  DEFAULT_MAINNET_ETHER_API_BASE_URL,
  DEFAULT_MAINNET_BSC_API_BASE_URL,
  DEFAULT_MAINNET_POLYGON_API_BASE_URL,
  DEFAULT_MAINNET_AVALANCHE_API_BASE_URL,
  DEFAULT_MAINNET_FANTOM_API_BASE_URL,
  DEFAULT_MAINNET_MOONBEAM_API_BASE_URL,
  DEFAULT_MAINNET_BASE_API_BASE_URL,
  DEFAULT_MAINNET_ARBITRUM_ONE_API_BASE_URL,
  DEFAULT_MAINNET_OPTIMISM_API_BASE_URL,
  DEFAULT_TESTNET_SEPOLIA_API_BASE_URL,
  DEFAULT_TESTNET_BSC_API_BASE_URL,
  DEFAULT_TESTNET_POLYGAN_MUMBAI_API_BASE_URL,
  DEFAULT_TESTNET_AVALANCHE_FUJI_API_BASE_URL,
  DEFAULT_TESTNET_FANTOM_API_BASE_URL,
  DEFAULT_TESTNET_MOONBASE_ALPHA_API_BASE_URL,
  DEFAULT_TESTNET_BASE_SEPOLIA_API_BASE_URL,
  DEFAULT_TESTNET_ARBITRUM_SEPOLIA_API_BASE_URL,
  DEFAULT_TESTNET_OPTIMISM_SEPOLIA_API_BASE_URL,
  createAxiosInstance,
  getDefaultScanApiBaseUrl,
  httpGetEtherProxy,
  httpGetFetchEventLogs,
  wrapParamsQueryString,
  wrapRequestParams,
} from '../src';
import nock from 'nock';

describe('test common.ts', () => {
  test('test getDefaultScanApiBaseUrl', async () => {
    expect(getDefaultScanApiBaseUrl(1)).toBe(DEFAULT_MAINNET_ETHER_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(56)).toBe(DEFAULT_MAINNET_BSC_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(137)).toBe(DEFAULT_MAINNET_POLYGON_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(43114)).toBe(DEFAULT_MAINNET_AVALANCHE_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(250)).toBe(DEFAULT_MAINNET_FANTOM_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(1284)).toBe(DEFAULT_MAINNET_MOONBEAM_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(8453)).toBe(DEFAULT_MAINNET_BASE_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(42161)).toBe(DEFAULT_MAINNET_ARBITRUM_ONE_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(10)).toBe(DEFAULT_MAINNET_OPTIMISM_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(11155111)).toBe(DEFAULT_TESTNET_SEPOLIA_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(97)).toBe(DEFAULT_TESTNET_BSC_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(80001)).toBe(DEFAULT_TESTNET_POLYGAN_MUMBAI_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(43113)).toBe(DEFAULT_TESTNET_AVALANCHE_FUJI_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(4002)).toBe(DEFAULT_TESTNET_FANTOM_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(1287)).toBe(DEFAULT_TESTNET_MOONBASE_ALPHA_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(84532)).toBe(DEFAULT_TESTNET_BASE_SEPOLIA_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(421614)).toBe(DEFAULT_TESTNET_ARBITRUM_SEPOLIA_API_BASE_URL);
    expect(getDefaultScanApiBaseUrl(11155420)).toBe(DEFAULT_TESTNET_OPTIMISM_SEPOLIA_API_BASE_URL);
    expect(() => getDefaultScanApiBaseUrl(11111111)).toThrow('Invalid chain id');
  });

  test('test createAxiosInstance', async () => {
    const baseUrl = 'http://localhost:9098';
    const axios = createAxiosInstance(baseUrl);
    expect(axios.defaults.baseURL).toBe(baseUrl);
  });

  test('test wrapRequestParams', async () => {
    const address = '0x111';
    const fromBlock = 10000;
    const toBlock = 20000;
    const page = 1;
    const offset = 1000;
    const apikey = 'SADDA';
    const topic0 = '0xbbb';
    const params = {
      module: 'logs',
      action: 'getLogs',
      address,
      fromBlock,
      toBlock,
      topic0,
      page,
      offset,
      apikey,
    };
    const testParams = wrapRequestParams(address, fromBlock, toBlock, page, offset, apikey, topic0);
    expect(testParams).toStrictEqual(params);
  });

  test('test httpGetFetchEventLogs', async () => {
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
    const testParams = wrapRequestParams(address, fromBlock, toBlock, page, offset, apikey, topic0);
    const baseUrl = 'http://mock-test.com';
    const axiosInstance = createAxiosInstance(baseUrl);
    expect(() => httpGetFetchEventLogs(axiosInstance, testParams)).rejects;
    nock('http://mock-test.com')
      .get('/api')
      .query({ module: 'logs', action: 'getLogs', address, fromBlock, toBlock, topic0, page, offset, apikey })
      .reply(200, {
        status: '1',
        message: 'OK',
        result: mockedEvents,
      });
    const events = await httpGetFetchEventLogs(axiosInstance, testParams);
    expect(events.length).toEqual(mockedEvents.length);
    expect(events).toStrictEqual(mockedEvents);
    testParams.page = 2;
    await expect(() => httpGetFetchEventLogs(axiosInstance, testParams)).rejects.toThrow();
    nock('http://mock-test2.com')
      .get('/api')
      .query({ module: 'logs', action: 'getLogs', address, fromBlock, toBlock, topic0, page, offset, apikey })
      .reply(200, {
        status: '0',
        message: 'NO RECORD',
        result: [],
      });
    const baseUrl2 = 'http://mock-test2.com';
    const axiosInstance2 = createAxiosInstance(baseUrl2);
    testParams.page = 1;
    const events2 = await httpGetFetchEventLogs(axiosInstance2, testParams);
    expect(events2.length).toEqual(0);
  });

  test('test httpGetFetchEventLogs error', async () => {
    const address = '0x111';
    const fromBlock = 10000;
    const toBlock = 20000;
    const page = 1;
    const offset = 1000;
    const apikey = 'SADDA';
    const topic0 = '0xbbb';
    const testParams = wrapRequestParams(address, fromBlock, toBlock, page, offset, apikey, topic0);
    const baseUrl = 'http://mock-test3.com';
    const data = {
      status: '0',
      message: 'NO RECORD',
      result: 'NO RECORD',
    };
    nock(baseUrl)
      .get('/api')
      .query({ module: 'logs', action: 'getLogs', address, fromBlock, toBlock, topic0, page, offset, apikey })
      .reply(200, data);
    const axiosInstance = createAxiosInstance(baseUrl);
    await expect(async () => await httpGetFetchEventLogs(axiosInstance, testParams)).rejects.toEqual(data);
    nock.cleanAll();
  });

  test('test wrapParamsQueryString', async () => {
    const map = new Map<string, any>();
    map.set('action', 'eth_call');
    map.set('module', 'proxy');
    const queryString = wrapParamsQueryString(map);
    expect('action=eth_call&module=proxy').toEqual(queryString);
  });

  test('test httpGetEtherProxy', async () => {
    const map = new Map<string, any>();
    map.set('action', 'eth_call');
    map.set('module', 'proxy');
    const mockedSuccessResp = {
      jsonrpc: '2.0',
      id: 1,
      result: '0x00000000000000000000000000000000000000000000000000601d8888141c00',
    };
    nock('http://mock-test.com')
      .get('/api')
      .query({
        action: 'eth_call',
        module: 'proxy',
      })
      .reply(200, mockedSuccessResp);
    const axiosInstance = createAxiosInstance('http://mock-test.com');
    const resp = await httpGetEtherProxy(axiosInstance, map);
    expect(resp).toEqual(mockedSuccessResp.result);
  });
});

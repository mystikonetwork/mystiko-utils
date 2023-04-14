import { ethers } from 'ethers';
import {
  DefaultProviderFactory,
  FallbackProvider,
  QuorumProviderFactory,
  ReconnectingWebSocketProvider,
} from '../../src';
import { buildServer, closeServer } from './websocket-server';

test('test DefaultProviderFactory', async () => {
  const wsServer = await buildServer(39737);
  const factory = new DefaultProviderFactory();
  const provider1 = factory.createProvider([
    {
      url: 'ws://localhost:39737',
      timeout: 500,
      maxTryCount: 5,
    },
  ]);
  expect(provider1 instanceof ReconnectingWebSocketProvider).toBe(true);
  expect((provider1 as ReconnectingWebSocketProvider).timeoutMs).toBe(500);
  expect((provider1 as ReconnectingWebSocketProvider).maxTryCount).toBe(5);
  await (provider1 as ReconnectingWebSocketProvider).destroy();
  const provider2 = factory.createProvider([{ url: 'http://localhost:8888' }]);
  expect(provider2 instanceof ethers.providers.JsonRpcProvider).toBe(true);
  const provider3 = factory.createProvider(['ws://localhost:39737', 'http://localhost:8888']);
  expect(provider3 instanceof FallbackProvider).toBe(true);
  await ((provider3 as FallbackProvider).providers[0] as ReconnectingWebSocketProvider).destroy();
  expect(() => factory.createProvider(['file://abc.socket'])).toThrow();
  await closeServer(wsServer);
});

test('test QuorumProviderFactory', () => {
  const factory = new QuorumProviderFactory();
  const provider1 = factory.createProvider(['http://localhost:39740']);
  expect((provider1 as ethers.providers.FallbackProvider).quorum).toBe(1);
  expect((provider1 as ethers.providers.FallbackProvider).providerConfigs[0].weight).toBe(1);
  const provider2 = factory.createProvider(
    [
      'http://localhost:39740',
      {
        url: 'http://localhost:8088',
      },
      {
        url: 'http://localhost:9088',
        quorumWeight: 2,
      },
    ],
    {},
  );
  expect((provider2 as ethers.providers.FallbackProvider).quorum).toBe(2);
  expect((provider2 as ethers.providers.FallbackProvider).providerConfigs[0].weight).toBe(1);
  expect((provider2 as ethers.providers.FallbackProvider).providerConfigs[1].weight).toBe(1);
  expect((provider2 as ethers.providers.FallbackProvider).providerConfigs[2].weight).toBe(2);
  const provider3 = factory.createProvider(
    [
      'http://localhost:39740',
      {
        url: 'http://localhost:8088',
      },
      {
        url: 'http://localhost:9088',
        quorumWeight: 2,
      },
    ],
    { quorumPercentage: 70 },
  );
  expect((provider3 as ethers.providers.FallbackProvider).quorum).toBe(3);
});

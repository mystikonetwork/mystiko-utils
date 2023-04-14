// eslint-disable-next-line max-classes-per-file
import { ethers } from 'ethers';
import { check } from '../check';
import { ReconnectingWebSocketProvider } from './websocket';
import FallbackProvider from './fallback';

export interface ProviderConnection extends ethers.utils.ConnectionInfo {
  maxTryCount?: number;
  quorumWeight?: number;
}

export interface ProviderOptions {
  quorumPercentage?: number;
}

export interface ProviderFactory {
  createProvider(
    connections: Array<string | ProviderConnection>,
    options?: ProviderOptions,
  ): ethers.providers.Provider;
}

function connectionsToProviders(
  connections: Array<string | ProviderConnection>,
): ethers.providers.BaseProvider[] {
  check(connections.length > 0, 'urls cannot be an empty array');
  const providers: ethers.providers.BaseProvider[] = [];
  connections.forEach((connection) => {
    const url = typeof connection === 'string' ? connection : connection.url;
    if (url.match(/^wss?:\/\//)) {
      providers.push(
        new ReconnectingWebSocketProvider(url, {
          timeoutMs: typeof connection !== 'string' ? connection.timeout : undefined,
          maxTryCount: typeof connection !== 'string' ? connection.maxTryCount : undefined,
        }),
      );
    } else if (url.match(/^https?:\/\//)) {
      providers.push(new ethers.providers.JsonRpcProvider(connection));
    } else {
      throw new Error(`unsupported url scheme: ${url}`);
    }
  });
  return providers;
}

export class DefaultProviderFactory implements ProviderFactory {
  // eslint-disable-next-line class-methods-use-this
  public createProvider(connections: Array<string | ProviderConnection>): ethers.providers.Provider {
    const providers = connectionsToProviders(connections);
    if (providers.length > 1) {
      return new FallbackProvider(providers);
    }
    return providers[0];
  }
}

export class QuorumProviderFactory implements ProviderFactory {
  // eslint-disable-next-line class-methods-use-this
  public createProvider(
    connections: Array<string | ProviderConnection>,
    options?: ProviderOptions,
  ): ethers.providers.Provider {
    const providers = connectionsToProviders(connections);
    const optionsWithDefaults = options || {};
    const quorumPercentage = optionsWithDefaults.quorumPercentage || 50;
    check(quorumPercentage >= 50 && quorumPercentage <= 100, 'quorumPercentage must be between 50 and 100');
    const providerConfigs: ethers.providers.FallbackProviderConfig[] = [];
    let totalWeight = 0;
    for (let i = 0; i < connections.length; i += 1) {
      const connection = connections[i];
      const weight = typeof connection !== 'string' ? connection.quorumWeight || 1 : 1;
      check(weight > 0, 'quorum weight must be greater than 0');
      totalWeight += weight;
      const providerConfig: ethers.providers.FallbackProviderConfig = {
        provider: providers[i],
        weight,
      };
      providerConfigs.push(providerConfig);
    }
    const quorum = Math.ceil((totalWeight * quorumPercentage) / 100.0);
    return new ethers.providers.FallbackProvider(providerConfigs, quorum);
  }
}

import { ethers } from 'ethers';
import { EtherError } from './error';

function handleTransactionReceipt(
  receiptPromise: Promise<ethers.providers.TransactionReceipt>,
): Promise<ethers.providers.TransactionReceipt> {
  return receiptPromise
    .then((receipt) => {
      if (receipt.status === 0) {
        return Promise.reject(new Error('transaction failed'));
      }
      return Promise.resolve(receipt);
    })
    .catch((error: Error) => {
      const etherError = error as EtherError;
      if (etherError.code === ethers.errors.TRANSACTION_REPLACED && etherError.receipt) {
        return Promise.resolve(etherError.receipt);
      }
      return Promise.reject(error);
    });
}

export interface TransactionResponseLike {
  wait: (confirmations?: number) => Promise<ethers.providers.TransactionReceipt>;
}

export function waitTransaction(
  txResponse: TransactionResponseLike,
  confirmations?: number,
): Promise<ethers.providers.TransactionReceipt> {
  return handleTransactionReceipt(txResponse.wait(confirmations));
}

export function waitTransactionHash(
  provider: ethers.providers.Provider,
  txHash: string,
  confirmations?: number,
  timeout?: number,
): Promise<ethers.providers.TransactionReceipt> {
  return handleTransactionReceipt(provider.waitForTransaction(txHash, confirmations, timeout));
}

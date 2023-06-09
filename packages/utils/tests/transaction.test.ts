// eslint-disable-next-line max-classes-per-file
import { ethers } from 'ethers';
import { EtherError, TransactionResponseLike, waitTransaction, waitTransactionHash } from '../src';

class MockTransaction implements TransactionResponseLike {
  private readonly error?: Error;

  private readonly shouldReplace: boolean;

  private readonly originalTxReceipt: ethers.providers.TransactionReceipt;

  private readonly replacedTxReceipt?: ethers.providers.TransactionReceipt;

  constructor(
    originalTxReceipt: ethers.providers.TransactionReceipt,
    replacedTxReceipt?: ethers.providers.TransactionReceipt,
    shouldReplace?: boolean,
    error?: Error,
  ) {
    this.error = error;
    this.originalTxReceipt = originalTxReceipt;
    this.replacedTxReceipt = replacedTxReceipt;
    this.shouldReplace = shouldReplace || false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public wait(confirmations?: number): Promise<ethers.providers.TransactionReceipt> {
    if (this.error) {
      if (this.shouldReplace) {
        const error = new Error();
        (error as EtherError).code = ethers.errors.TRANSACTION_REPLACED;
        (error as EtherError).receipt = this.replacedTxReceipt;
        return Promise.reject(error);
      }
      return Promise.reject(this.error);
    }
    return Promise.resolve(this.originalTxReceipt);
  }
}

class MockProvider extends ethers.providers.JsonRpcProvider {
  private readonly error?: Error;

  private readonly shouldReplace: boolean;

  private readonly originalTxReceipt: ethers.providers.TransactionReceipt;

  private readonly replacedTxReceipt?: ethers.providers.TransactionReceipt;

  constructor(
    originalTxReceipt: ethers.providers.TransactionReceipt,
    replacedTxReceipt?: ethers.providers.TransactionReceipt,
    shouldReplace?: boolean,
    error?: Error,
  ) {
    super('http://localhost:8545');
    this.error = error;
    this.originalTxReceipt = originalTxReceipt;
    this.replacedTxReceipt = replacedTxReceipt;
    this.shouldReplace = shouldReplace || false;
  }

  public waitForTransaction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transactionHash: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    confirmations?: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timeout?: number,
  ): Promise<ethers.providers.TransactionReceipt> {
    if (this.error) {
      if (this.shouldReplace) {
        const error = new Error();
        (error as EtherError).code = ethers.errors.TRANSACTION_REPLACED;
        (error as EtherError).receipt = this.replacedTxReceipt;
        return Promise.reject(error);
      }
      return Promise.reject(this.error);
    }
    return Promise.resolve(this.originalTxReceipt);
  }
}

test('test waitTransaction', async () => {
  const case1 = new MockTransaction({
    transactionHash: '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
  } as ethers.providers.TransactionReceipt);
  expect((await waitTransaction(case1)).transactionHash).toBe(
    '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
  );
  const case2 = new MockTransaction(
    {
      transactionHash: '0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23',
    } as ethers.providers.TransactionReceipt,
    undefined,
    false,
    new Error('random'),
  );
  await expect(waitTransaction(case2)).rejects.toThrow(new Error('random'));
  const case3 = new MockTransaction(
    {
      transactionHash: '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
    } as ethers.providers.TransactionReceipt,
    {
      transactionHash: '0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23',
    } as ethers.providers.TransactionReceipt,
    true,
    new Error('random'),
  );
  expect((await waitTransaction(case3)).transactionHash).toBe(
    '0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23',
  );
  const case4 = new MockTransaction({
    transactionHash: '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
    status: 0,
  } as ethers.providers.TransactionReceipt);
  await expect(waitTransaction(case4)).rejects.toThrow(new Error('transaction failed'));
});

test('test waitTransactionHash', async () => {
  const provider1 = new MockProvider({
    transactionHash: '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
  } as ethers.providers.TransactionReceipt);
  expect(
    (
      await waitTransactionHash(
        provider1,
        '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
      )
    ).transactionHash,
  ).toBe('0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997');
  const provider2 = new MockProvider(
    {
      transactionHash: '0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23',
    } as ethers.providers.TransactionReceipt,
    undefined,
    false,
    new Error('random'),
  );
  await expect(
    waitTransactionHash(provider2, '0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23'),
  ).rejects.toThrow(new Error('random'));
  const provider3 = new MockProvider(
    {
      transactionHash: '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
    } as ethers.providers.TransactionReceipt,
    {
      transactionHash: '0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23',
    } as ethers.providers.TransactionReceipt,
    true,
    new Error('random'),
  );
  expect(
    (
      await waitTransactionHash(
        provider3,
        '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
      )
    ).transactionHash,
  ).toBe('0x663acbbce78801a4c36ee54291e08f40a4831e6246cbf00c761727d60c0efb23');
  const provider4 = new MockProvider({
    transactionHash: '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997',
    status: 0,
  } as ethers.providers.TransactionReceipt);
  await expect(
    waitTransactionHash(provider4, '0x12e7909f206e3a83f5d5f066f649440fe518ae6c3011b25f3f834c37258b3997'),
  ).rejects.toThrow(new Error('transaction failed'));
});

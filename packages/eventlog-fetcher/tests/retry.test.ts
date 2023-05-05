import { DefaultRetryPolicy } from '../src';

describe('test retry.ts', () => {
  test('test DefaultRetryPolicy', async () => {
    const retryPolicy = new DefaultRetryPolicy(10);
    const error = new Error('test error');
    expect(retryPolicy.isRetryable(error, 5)).toEqual(false);
    expect(retryPolicy.isRetryable(error, 20)).toEqual(false);
    const error2 = {
      result: 'Max rate limit reached, please use API Key for higher rate limit',
    };
    expect(retryPolicy.isRetryable(error2, 5)).toEqual(true);
    expect(retryPolicy.isRetryable(error2, 20)).toEqual(false);
  });
});

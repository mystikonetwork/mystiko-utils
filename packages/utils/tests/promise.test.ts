import { promisesSequentially, promiseWithTimeout, TimeoutError } from '../src';

test('test promiseWithTimeout', async () => {
  let timer: NodeJS.Timer | undefined;
  const promise = new Promise((resolve) => {
    timer = setTimeout(resolve, 3000);
  });
  await expect(promiseWithTimeout(promise, 100)).rejects.toThrow(new TimeoutError('timeout after 100 ms'));
  if (timer) {
    clearTimeout(timer);
  }
});

test('test promisesSequentially', async () => {
  const promiseCreators: Array<() => Promise<number>> = [];
  let results = await promisesSequentially(promiseCreators);
  expect(results).toStrictEqual([]);
  const numOfPromises = 5;
  for (let i = 0; i < numOfPromises; i += 1) {
    promiseCreators[i] = () => Promise.resolve(i + 1);
  }
  results = await promisesSequentially(promiseCreators);
  expect(results).toStrictEqual([1, 2, 3, 4, 5]);
});

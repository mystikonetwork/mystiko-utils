export class TimeoutError extends Error {}

export function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timer | undefined;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  }).then(() => Promise.reject(new TimeoutError(`timeout after ${timeoutMs} ms`)));
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  });
}

function promisesSequentiallyWithIndex<T>(
  promiseCreators: Array<() => Promise<T>>,
  currentIndex: number,
): Promise<T[]> {
  if (currentIndex < promiseCreators.length && currentIndex >= 0) {
    return promiseCreators[currentIndex]().then((result) =>
      promisesSequentiallyWithIndex(promiseCreators, currentIndex + 1).then((results) => [
        result,
        ...results,
      ]),
    );
  }
  return Promise.resolve([]);
}

export function promisesSequentially<T>(promiseCreators: Array<() => Promise<T>>): Promise<T[]> {
  return promisesSequentiallyWithIndex(promiseCreators, 0);
}

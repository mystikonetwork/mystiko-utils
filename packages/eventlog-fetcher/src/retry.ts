export interface RetryPolicy {
  isRetryable(error: any, currentRetryTime: number): boolean;
}

export class DefaultRetryPolicy implements RetryPolicy {
  private readonly maxRetryTimes: number;

  constructor(maxRetryTimes = 5) {
    this.maxRetryTimes = maxRetryTimes;
  }

  isRetryable(error: any, currentRetryTime: number): boolean {
    if (currentRetryTime >= this.maxRetryTimes) {
      return false;
    }
    if (error && String(error.result).search('rate limit') !== -1) {
      return true;
    }
    return false;
  }
}

const { retry, RetryError } = require('../../src/utils/retry');

describe('retry utility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first attempt if operation succeeds', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await retry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry specified number of times before failing', async () => {
    const error = new Error('Operation failed');
    const operation = jest.fn().mockRejectedValue(error);
    
    const retryPromise = retry(operation, { maxAttempts: 3, delay: 1000 });
    
    // Fast-forward through retries
    for (let i = 0; i < 2; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }
    
    await expect(retryPromise).rejects.toThrow(RetryError);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should succeed on retry if operation eventually succeeds', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success');
    
    const retryPromise = retry(operation, { maxAttempts: 3, delay: 1000 });
    
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    
    const result = await retryPromise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should respect shouldRetry function', async () => {
    const error = new Error('Bad Request');
    error.status = 400;
    
    const operation = jest.fn().mockRejectedValue(error);
    const shouldRetry = (error) => error.status >= 500;
    
    await expect(retry(operation, { shouldRetry }))
      .rejects.toThrow(RetryError);
    
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
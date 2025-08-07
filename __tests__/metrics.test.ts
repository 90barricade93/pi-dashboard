describe('metrics + alerting', () => {
  const REAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...REAL_ENV };
  });

  afterAll(() => {
    process.env = REAL_ENV;
  });

  test('counter increments and snapshot totals', async () => {
    const { metrics } = await import('../lib/metrics');
    const c = metrics.counter('test_counter', 'Test help');

    expect(c.get()).toBe(0);
    c.inc();
    c.inc(2);
    expect(c.get()).toBe(3);

    const snap = metrics.snapshot();
    expect(snap.test_counter).toBe(3);
  });

  test('labels track separate series', async () => {
    const { metrics } = await import('../lib/metrics');
    const c = metrics.counter('labeled');

    c.inc(1, { a: 'x' });
    c.inc(2, { a: 'y' });

    // total
    expect(c.get()).toBe(3);
    // series
    expect(c.get({ a: 'x' })).toBe(1);
    expect(c.get({ a: 'y' })).toBe(2);
  });

  test('isRateLimitAlerting respects window and threshold', async () => {
    process.env['METRICS_ALERT_TWITTER_RATE_LIMIT_WINDOW_MS'] = '10000';
    process.env['METRICS_ALERT_TWITTER_RATE_LIMIT_THRESHOLD'] = '3';

    jest.resetModules();
    const mod = await import('../lib/metrics');
    const { recordTwitterRateLimit, isRateLimitAlerting } = mod;

    const nowSpy = jest.spyOn(Date, 'now');

    // t0
    nowSpy.mockReturnValue(1_000_000);
    recordTwitterRateLimit();
    recordTwitterRateLimit();
    expect(isRateLimitAlerting()).toBe(false);

    // hit threshold within window
    recordTwitterRateLimit();
    expect(isRateLimitAlerting()).toBe(true);

    // move just past window => should drop below threshold
    nowSpy.mockReturnValue(1_010_001);
    expect(isRateLimitAlerting()).toBe(false);

    nowSpy.mockRestore();
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchReportModule, invalidateReportCache } from './lib';

const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }));

test('requested report sections and branch scope have separate cache entries from full reports', async (t) => {
  invalidateReportCache();
  const calls: URL[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = new URL(String(input), 'http://localhost');
    calls.push(url);
    return response({ result: calls.length });
  });
  const args = ['report-cache-test', 'billing', '2026-09-01', '2026-09-16'] as const;
  const subset = { branchBilling: true, branchId: 1, reportKeys: ['revenue_by_medicine', 'revenue_by_consultant'] };
  assert.deepEqual(await fetchReportModule(...args, subset), { result: 1 });
  assert.deepEqual(await fetchReportModule(...args, { ...subset, reportKeys: [...subset.reportKeys].reverse() }), { result: 1 });
  assert.deepEqual(await fetchReportModule(...args, { branchBilling: true, branchId: 1 }), { result: 2 });
  assert.deepEqual(await fetchReportModule(...args, { ...subset, branchId: 2 }), { result: 3 });
  assert.equal(calls[0].searchParams.get('report_keys'), 'revenue_by_consultant,revenue_by_medicine');
  assert.equal(calls[0].searchParams.get('billing_scope'), 'branch');
  assert.equal(calls[2].searchParams.get('branch_id'), '2');
  assert.equal(calls[1].searchParams.has('report_keys'), false);
});

test('Bills Next force refresh retrieves newly changed amounts', async (t) => {
  invalidateReportCache();
  let amount = 100;
  t.mock.method(globalThis, 'fetch', async () => response({ amount }));
  const args = ['fresh-amount-test', 'billing', '2026-09-01', '2026-09-16'] as const;
  assert.deepEqual(await fetchReportModule(...args, { force: true }), { amount: 100 });
  amount = 250;
  assert.deepEqual(await fetchReportModule(...args, { force: true }), { amount: 250 });
});

test('cancelled response cannot populate the report cache', async (t) => {
  invalidateReportCache();
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      assert.equal(init?.signal, controller.signal);
      controller.abort();
    }
    return response({ result: calls });
  });
  const args = ['cancel-cache-test', 'billing', '2026-09-01', '2026-09-16'] as const;
  await assert.rejects(fetchReportModule(...args, { signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(await fetchReportModule(...args), { result: 2 });
});

test('cancellable loads do not share their request with other report consumers', async (t) => {
  invalidateReportCache();
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => response({ result: ++calls }));
  const args = ['isolated-request-test', 'billing', '2026-09-01', '2026-09-16'] as const;
  const [cancellable, shared] = await Promise.all([
    fetchReportModule(...args, { signal: controller.signal }),
    fetchReportModule(...args),
  ]);
  assert.deepEqual(cancellable, { result: 1 });
  assert.deepEqual(shared, { result: 2 });
});

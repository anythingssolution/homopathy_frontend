import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consultantTotals, fetchBillPayments, fetchBillRows, mergeConsultants } from './lib';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const response = (page: number, totalPages: number) => new Response(JSON.stringify({
  success: true, data: [{ bill_id: page }], meta: { total_pages: totalPages },
}));

test('bill pages retain server order when bounded parallel requests finish out of order', async (t) => {
  const started = Array.from({ length: 6 }, () => deferred<void>());
  const pending = Array.from({ length: 6 }, () => deferred<Response>());
  const calls: number[] = [];
  const controller = new AbortController();
  let active = 0;
  let maxActive = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const page = Number(url.searchParams.get('page'));
    assert.equal(url.pathname, '/api/v1/bills');
    assert.equal(url.searchParams.get('branch_id'), '2');
    assert.equal(url.searchParams.get('from_date'), '2026-09-01');
    assert.equal(url.searchParams.get('billing_scope'), 'branch');
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(init?.signal, controller.signal);
    calls.push(page);
    active += 1;
    maxActive = Math.max(maxActive, active);
    started[page].resolve();
    const result = page === 1 ? response(1, 5) : await pending[page].promise;
    active -= 1;
    return result;
  });
  const result = fetchBillRows('test-token', { branch_id: '2', from_date: '2026-09-01' }, controller.signal);
  await Promise.all([started[2].promise, started[3].promise]);
  assert.deepEqual(calls, [1, 2, 3]);
  pending[3].resolve(response(3, 5));
  await started[4].promise;
  pending[4].resolve(response(4, 5));
  await started[5].promise;
  pending[5].resolve(response(5, 5));
  pending[2].resolve(response(2, 5));
  assert.deepEqual((await result).map((row) => row.bill_id), [1, 2, 3, 4, 5]);
  assert.equal(maxActive, 2);
});

test('payment list retains all entries and avoids extra pages for a single-page response', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    assert.match(String(input), /^\/api\/v1\/bills\/payments\?/);
    calls += 1;
    return new Response(JSON.stringify({ success: true, data: [{ payment_id: 8 }, { payment_id: 9 }], meta: { total_pages: 1 } }));
  });
  assert.deepEqual(await fetchBillPayments('token', {}), [{ payment_id: 8 }, { payment_id: 9 }]);
  assert.equal(calls, 1);
});

test('aborted filter load stops scheduling more pages even if a transport finishes after cancellation', async (t) => {
  const controller = new AbortController();
  const started = deferred<void>();
  const pending = deferred<Response>();
  const calls: number[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const page = Number(new URL(String(input), 'http://localhost').searchParams.get('page'));
    calls.push(page);
    if (page === 1) return response(1, 4);
    if (calls.length === 3) started.resolve();
    return (await pending.promise).clone();
  });
  const result = fetchBillRows('token', {}, controller.signal);
  await started.promise;
  controller.abort();
  pending.resolve(response(2, 4));
  await assert.rejects(result, { name: 'AbortError' });
  assert.deepEqual(calls, [1, 2, 3]);
});

test('a failed later page rejects the complete list rather than showing partial totals', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const page = Number(new URL(String(input), 'http://localhost').searchParams.get('page'));
    return page === 1 ? response(1, 2) : new Response(JSON.stringify({ success: false, message: 'Page unavailable' }), { status: 500 });
  });
  await assert.rejects(fetchBillRows('token', {}), /Page unavailable/);
});

test('consultant and session counts use unique consultations without changing financial sums', () => {
  // The same consultation can have an unpaid consultation bill and a paid
  // medication bill, so adding the payment-group counts counts it twice.
  const morning = [
    { doctor_id: 1, doctor_name: 'Doctor', payment_mode: 'UNPAID', total_consultations: 2, total_gross_revenue: 100, total_paid_revenue: 0, total_pending_revenue: 100 },
    { doctor_id: 1, doctor_name: 'Doctor', payment_mode: 'CASH', total_consultations: 2, total_gross_revenue: 200, total_paid_revenue: 200, total_pending_revenue: 0 },
  ];
  const evening = [{ ...morning[1], total_consultations: 1, total_gross_revenue: 50, total_paid_revenue: 50 }];
  const consultation_counts = [{ doctor_id: 1, total_consultations: 3, morning_consultations: 2, evening_consultations: 1 }];
  const before = mergeConsultants([...morning, ...evening])[0];
  const after = mergeConsultants([...morning, ...evening], consultation_counts)[0];
  assert.equal(before.total_consultations, 5);
  assert.deepEqual(after, { ...before, total_consultations: 3 });
  assert.equal(mergeConsultants(morning, consultation_counts, 'morning')[0].total_consultations, 2);
  assert.equal(mergeConsultants(evening, consultation_counts, 'evening')[0].total_consultations, 1);
  assert.deepEqual(consultantTotals({ morning, evening, consultation_counts }), {
    ...consultantTotals({ morning, evening }), consults: 3,
  });
});

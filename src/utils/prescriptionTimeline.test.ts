import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPrescriptionTimeline } from './prescriptionTimeline';

test('record previews retain explicit branch, family and date filters and sort mixed print records', async () => {
  const previousFetch = globalThis.fetch;
  let requested = '';
  globalThis.fetch = async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ success: true, data: { items: [
      { record_type: 'CONSULTATION', source_id: 1038, event_at: '2026-11-03T09:00:00Z' },
      { record_type: 'DIRECT_MEDICINE', source_id: 2000, event_at: '2026-11-04T09:00:00Z' },
    ] } }), { status: 200 });
  };
  try {
    const items = await loadPrescriptionTimeline({ token: 'test-token', patientId: 2960, familyMemberId: 723,
      branchId: 'all', fromDate: '2026-11-01', toDate: '2026-11-14' });
    const params = new URL(requested, 'http://localhost').searchParams;
    assert.equal(params.get('branch_id'), 'all');
    assert.equal(params.get('family_member_id'), '723');
    assert.equal(params.get('from_date'), '2026-11-01');
    assert.equal(params.get('to_date'), '2026-11-14');
    assert.equal(params.has('subject_scope'), false);
    assert.deepEqual(items.map(item => item.source_id), [2000, 1038]);
    await loadPrescriptionTimeline({ token: 'test-token', patientId: 2960, branchId: 2, subjectScope: 'SELF' });
    assert.equal(new URL(requested, 'http://localhost').searchParams.get('branch_id'), '2');
    assert.equal(new URL(requested, 'http://localhost').searchParams.get('subject_scope'), 'SELF');
    await loadPrescriptionTimeline({ token: 'test-token', patientId: 2960 });
    assert.equal(new URL(requested, 'http://localhost').searchParams.has('branch_id'), false);
  } finally { globalThis.fetch = previousFetch; }
});

test('empty printable history is valid, while unauthorized responses remain errors', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { items: [] } }), { status: 200 });
    assert.deepEqual(await loadPrescriptionTimeline({ token: 'test-token', patientId: 2960, branchId: 'all' }), []);
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Not authorized' }), { status: 403 });
    await assert.rejects(loadPrescriptionTimeline({ token: 'test-token', patientId: 2960, branchId: 'all' }), /Not authorized/);
  } finally { globalThis.fetch = previousFetch; }
});

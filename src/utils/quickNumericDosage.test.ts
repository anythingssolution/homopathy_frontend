import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveQuickNumericDoses } from './quickNumericDosage';

test('inline and slash alpha codes retain exact master schedules for every duration and frequency', () => {
  const templates = [
    { token: '36q', doses: { morning: 5, afternoon: 5, night: 5 } },
    { token: '12/HS', doses: { morning: 0, afternoon: 0, night: 4 } },
    { token: '12OD', doses: { morning: 4, afternoon: 0, night: 0 } },
    { token: '12/BD', doses: { morning: 4, afternoon: 0, night: 4 } },
    { token: '12[5,12]CUSTOM', doses: { morning: 2, afternoon: 7, night: 9 } },
  ];
  for (const { token, doses } of templates) {
    for (const duration of ['7', '15', '30', '45', '2M', '3M', '6M']) {
      for (const frequency of ['2', '3'] as const) {
        assert.deepEqual(resolveQuickNumericDoses(doses, duration, frequency, token), doses);
      }
    }
  }
});

test('normal numeric medicines apply short and long duration frequency rules including power and price suffixes', () => {
  const master = { morning: 5, afternoon: 5, night: 5 };
  for (const token of ['36', '36[5,12]', '36/5', '36/50', '36/500']) {
    for (const duration of ['7', '15']) {
      assert.deepEqual(resolveQuickNumericDoses(master, duration, '3', token), { morning: 4, afternoon: 4, night: 4 });
      assert.deepEqual(resolveQuickNumericDoses(master, duration, '2', token), { morning: 8, afternoon: 0, night: 8 });
    }
    for (const duration of ['30', '45', '2M', '3M', '6M']) {
      assert.deepEqual(resolveQuickNumericDoses(master, duration, '3', token), { morning: 3, afternoon: 3, night: 3 });
      assert.deepEqual(resolveQuickNumericDoses(master, duration, '2', token), { morning: 6, afternoon: 0, night: 6 });
    }
  }
});

test('frequency toggles update normal schedules without mutating special-code master doses', () => {
  const master = Object.freeze({ morning: 5, afternoon: 5, night: 5 });
  assert.deepEqual(resolveQuickNumericDoses(master, '15', '2', '36'), { morning: 8, afternoon: 0, night: 8 });
  assert.deepEqual(resolveQuickNumericDoses(master, '15', '3', '36'), { morning: 4, afternoon: 4, night: 4 });
  const q = resolveQuickNumericDoses(master, '15', '2', '36Q');
  assert.deepEqual(q, master);
  assert.notEqual(q, master);
});

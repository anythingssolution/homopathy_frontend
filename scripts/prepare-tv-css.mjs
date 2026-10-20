import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from 'tailwindcss-tv';
import autoprefixer from 'autoprefixer';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = path.join(root, 'src/tv/queue.css');
const output = path.join(root, 'live-queue-flow-2/styles.css');
const result = await postcss([
  // TV-only CSS: avoid Tailwind 4's @property / color-mix / cascade-layer requirements.
  tailwind({
    content: [path.join(root, 'src/components/LiveQueueFlow.tsx'), path.join(root, 'src/components/ScheduleRuleNotice.tsx')],
    theme: { extend: {
      fontFamily: { sans: ['Zen Maru Gothic', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: { 'primary-teal': '#78C2C4' },
      opacity: { 15: '.15', 35: '.35', 45: '.45', 65: '.65', 85: '.85' },
      minWidth: { 16: '4rem', 20: '5rem', 28: '7rem' },
      minHeight: { 72: '18rem' },
    } },
  }),
  autoprefixer({ overrideBrowserslist: ['Chrome >= 64', 'Firefox >= 68', 'Safari >= 12'] }),
]).process(await fs.readFile(input, 'utf8'), { from: input, to: output });
await fs.writeFile(output, result.css);

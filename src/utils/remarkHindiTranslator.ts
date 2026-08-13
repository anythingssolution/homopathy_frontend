const DROP_TIMES_DAY_PATTERN =
  /^(\d+)\s*drops?\s+(?:for\s+)?(\d+)\s*times?\s*(?:in\s+a\s+day|per\s+day|daily)?\.?$/i;

const DROP_TIMES_PATTERN = /^(\d+)\s*drops?\s+(?:for\s+)?(\d+)\s*times?\.?$/i;

const SPOON_PATTERN = /^(\d+)\s*spoons?\.?$/i;

/**
 * Clinic Hinglish / English phrase map.
 * Longer phrases first.
 */
const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(\d+)\s*drops?\s+(?:for\s+)?(\d+)\s*times?\s*(?:in\s+a\s+day|per\s+day|daily)\b/gi, '$1 ड्रॉप दिन में $2 बार'],
  [/\b(\d+)\s*drops?\s+(?:for\s+)?(\d+)\s*times?\b/gi, '$1 ड्रॉप $2 बार'],
  [/\b(\d+)\s*spoons?\s+(?:for\s+)?(\d+)\s*times?\s*(?:in\s+a\s+day|per\s+day|daily)\b/gi, '$1 चम्मच दिन में $2 बार'],
  [/\b(\d+)\s*spoons?\s+(?:for\s+)?(\d+)\s*times?\b/gi, '$1 चम्मच $2 बार'],
  [/\b(\d+)\s*drops?\b/gi, '$1 ड्रॉप'],
  [/\b(\d+)\s*spoons?\b/gi, '$1 चम्मच'],

  [/\bsone\s+se\s+(?:phle|phele|pehle)\b/gi, 'सोने से पहले'],
  [/\bkhane\s+se\s+(?:phle|phele|pehle)\b/gi, 'खाने से पहले'],
  [/\bkhane\s+ke\s+baad\b/gi, 'खाने के बाद'],
  [/\bpine\s+se\s+(?:phle|phele|pehle)\b/gi, 'पीने से पहले'],
  [/\bkhali\s+pet(?:h)?\b/gi, 'खाली पेट'],
  [/\bthande\s+pani\b/gi, 'ठंडे पानी'],
  [/\bthanda\s+pani\b/gi, 'ठंडा पानी'],
  [/\bgarm\s+pani\b/gi, 'गर्म पानी'],
  [/\bgharam\s+pani\b/gi, 'गर्म पानी'],

  [/\bin a day\b/gi, 'दिन में'],
  [/\bper day\b/gi, 'प्रति दिन'],
  [/\bbefore meals?\b/gi, 'भोजन से पहले'],
  [/\bafter meals?\b/gi, 'भोजन के बाद'],
  [/\bempty stomach\b/gi, 'खाली पेट'],
  [/\bwith\s+cold\s+water\b/gi, 'ठंडे पानी के साथ'],
  [/\bwith\s+warm\s+water\b/gi, 'गर्म पानी के साथ'],
  [/\bwith\s+water\b/gi, 'पानी के साथ'],
  [/\bwith\s+milk\b/gi, 'दूध के साथ'],

  [/\bk(?:e)?\s+sath(?:e|h)?\b/gi, 'के साथ'],
  [/\bke\s+saath(?:e)?\b/gi, 'के साथ'],
  [/\bk(?:e)?\s+saath(?:e)?\b/gi, 'के साथ'],
  [/\bya\s+(?:fir|phir)\b/gi, 'या फिर'],
  [/\btimes?\s+a\s+day\b/gi, 'बार दिन में'],
  [/\btwice\s+(?:a\s+)?day\b/gi, 'दिन में दो बार'],
  [/\bthrice\s+(?:a\s+)?day\b/gi, 'दिन में तीन बार'],
  [/\bonce\s+(?:a\s+)?day\b/gi, 'दिन में एक बार'],
];

/**
 * Single-word / short-token map (roman Hinglish + English).
 * Keys are lowercase; matching is case-insensitive.
 */
const WORD_MAP: Record<string, string> = {
  // English
  drop: 'ड्रॉप',
  drops: 'ड्रॉप',
  spoon: 'चम्मच',
  spoons: 'चम्मच',
  time: 'बार',
  times: 'बार',
  daily: 'प्रतिदिन',
  morning: 'सुबह',
  afternoon: 'दोपहर',
  evening: 'शाम',
  night: 'रात',
  twice: 'दो बार',
  thrice: 'तीन बार',
  once: 'एक बार',
  apply: 'लगाएं',
  take: 'लें',
  with: 'के साथ',
  water: 'पानी',
  milk: 'दूध',
  gram: 'ग्राम',
  grams: 'ग्राम',
  ml: 'मिली',
  tablet: 'गोली',
  tablets: 'गोली',
  capsule: 'कैप्सूल',
  capsules: 'कैप्सूल',
  day: 'दिन',
  days: 'दिन',
  and: 'और',
  or: 'या',
  before: 'पहले',
  after: 'बाद',
  cold: 'ठंडा',
  warm: 'गर्म',
  hot: 'गर्म',

  // Hinglish / roman Hindi (incl. common typos)
  grm: 'ग्राम',
  grms: 'ग्राम',
  pani: 'पानी',
  paani: 'पानी',
  dudh: 'दूध',
  doodh: 'दूध',
  sath: 'साथ',
  sathe: 'साथ',
  saath: 'साथ',
  saathe: 'साथ',
  fir: 'फिर',
  phir: 'फिर',
  ya: 'या',
  aur: 'और',
  se: 'से',
  me: 'में',
  men: 'में',
  mein: 'में',
  ko: 'को',
  ki: 'की',
  ka: 'का',
  ke: 'के',
  k: 'के',
  din: 'दिन',
  baar: 'बार',
  bar: 'बार',
  subah: 'सुबह',
  subha: 'सुबह',
  shaam: 'शाम',
  sham: 'शाम',
  dopahar: 'दोपहर',
  raat: 'रात',
  khali: 'खाली',
  pet: 'पेट',
  peth: 'पेट',
  pait: 'पेट',
  bhojan: 'भोजन',
  pehle: 'पहले',
  phle: 'पहले',
  phele: 'पहले',
  baad: 'बाद',
  nahi: 'नहीं',
  nahin: 'नहीं',
  mat: 'मत',
  le: 'ले',
  len: 'लें',
  lo: 'लो',
  lena: 'लेना',
  chammach: 'चम्मच',
  chamach: 'चम्मच',
  sone: 'सोने',
  sonay: 'सोने',
  khane: 'खाने',
  khana: 'खाना',
  pine: 'पीने',
  peene: 'पीने',
  thande: 'ठंडे',
  thanda: 'ठंडा',
  thandey: 'ठंडे',
  garm: 'गर्म',
  garam: 'गर्म',
  gharam: 'गर्म',
  dawai: 'दवा',
  dawaa: 'दवा',
  medicine: 'दवा',
  syrup: 'सिरप',
  ointment: 'मलहम',
  cream: 'क्रीम',
};

const collapseSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();

const hasHindiScript = (value: string) => /[\u0900-\u097F]/.test(value);

const normalizeToken = (token: string) =>
  token
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\.+$/g, '');

const applyPhraseMaps = (source: string): string => {
  let translated = source;
  PHRASE_REPLACEMENTS.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });
  return translated;
};

const applyWordMap = (source: string): string => {
  return source
    .split(/(\s+|[,/|+\-]+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || /^[,/|+\-]+$/.test(part)) {
        return part;
      }
      if (hasHindiScript(part) || /^\d+[.,]?$/.test(part)) {
        return part;
      }

      const raw = part;
      const leading = raw.match(/^[^A-Za-z\u0900-\u097F0-9]*/)?.[0] || '';
      const trailing = raw.match(/[^A-Za-z\u0900-\u097F0-9]*$/)?.[0] || '';
      const core = raw.slice(leading.length, raw.length - trailing.length);
      const key = normalizeToken(core);
      const mapped = WORD_MAP[key];
      if (mapped) {
        return `${leading}${mapped}${trailing}`;
      }
      return part;
    })
    .join('');
};

export function translateRemarkToHindi(input: string): string {
  const source = String(input || '').trim();
  if (!source) return '';

  // Fully Hindi already
  if (hasHindiScript(source) && !/[A-Za-z]/.test(source)) {
    return source;
  }

  const dropTimesDayMatch = source.match(DROP_TIMES_DAY_PATTERN);
  if (dropTimesDayMatch) {
    return `${dropTimesDayMatch[1]} ड्रॉप दिन में ${dropTimesDayMatch[2]} बार`;
  }

  const dropTimesMatch = source.match(DROP_TIMES_PATTERN);
  if (dropTimesMatch) {
    return `${dropTimesMatch[1]} ड्रॉप ${dropTimesMatch[2]} बार`;
  }

  const spoonMatch = source.match(SPOON_PATTERN);
  if (spoonMatch) {
    return `${spoonMatch[1]} चम्मच`;
  }

  const translated = collapseSpaces(applyWordMap(applyPhraseMaps(source)));
  return translated;
}

export function toStoredRemark(input: string): string {
  const source = String(input || '').trim();
  if (!source) return '';
  return translateRemarkToHindi(source) || source;
}

import Sanscript from 'sanscript';

const hasLatin = (value = '') => /[a-zA-Z]/.test(value);
const hasDevanagari = (value = '') => /[\u0900-\u097F]/.test(value);

export const toMarathi = (value = '') => {
  const input = value?.trim();
  if (!input) return '';

  try {
    return Sanscript.t(input, 'itrans', 'devanagari');
  } catch (error) {
    console.error('Transliteration failed', error);
    return input;
  }
};

export const toRoman = (value = '') => {
  const input = value?.trim();
  if (!input) return '';

  try {
    return Sanscript.t(input, 'devanagari', 'itrans');
  } catch (error) {
    console.error('Reverse transliteration failed', error);
    return input;
  }
};

const normalizeSegment = (segment = '') => {
  const trimmed = segment.trim();
  if (!trimmed) return segment;

  const containsLatin = hasLatin(trimmed);
  const containsDevan = hasDevanagari(trimmed);

  if (containsLatin && !containsDevan) {
    return toMarathi(trimmed);
  }

  if (containsDevan && !containsLatin) {
    const roman = toRoman(trimmed);
    return roman ? toMarathi(roman) : trimmed;
  }

  if (containsDevan && containsLatin) {
    const romanPart = toRoman(trimmed);
    const combined = romanPart || trimmed.replace(/[\u0900-\u097F]/g, '');
    return toMarathi(combined || romanPart || trimmed);
  }

  return trimmed;
};

export const normalizeMarathiText = (value = '') => {
  if (value === null || value === undefined) return '';
  const parts = String(value).split(/(\s+)/);
  return parts
    .map((part) => (part.trim() === '' ? part : normalizeSegment(part)))
    .join('');
};

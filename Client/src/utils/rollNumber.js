export const ROLL_NUMBER_PATTERN = '[0-9]{2}[A-Za-z]-[0-9]{4}';

export function formatRollNumber(value) {
  const characters = value.replace(/[^A-Za-z0-9]/g, '');
  let initialDigits = '';
  let letter = '';
  let finalDigits = '';

  for (const character of characters) {
    if (initialDigits.length < 2) {
      if (/[0-9]/.test(character)) initialDigits += character;
    } else if (!letter) {
      if (/[A-Za-z]/.test(character)) letter = character;
    } else if (finalDigits.length < 4 && /[0-9]/.test(character)) {
      finalDigits += character;
    }
  }

  return `${initialDigits}${letter}${letter ? '-' : ''}${finalDigits}`;
}

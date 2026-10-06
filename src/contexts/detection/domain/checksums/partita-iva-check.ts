/** Italian VAT number: 11 digits, the last one is the check digit. */
export const isValidPartitaIva = (value: string): boolean => {
  if (!/^\d{11}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = Number(value[i]);
    sum += i % 2 === 0 ? digit : digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
  }
  return (10 - (sum % 10)) % 10 === Number(value[10]);
};

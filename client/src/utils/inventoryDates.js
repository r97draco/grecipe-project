export function defaultExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

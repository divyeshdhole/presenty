export const getTodayKey = () => {
  const tz = process.env.TIMEZONE || 'Asia/Kolkata';
  const now = new Date();
  // convert to timezone offset manually
  const localeString = now.toLocaleString('en-US', { timeZone: tz });
  const zoned = new Date(localeString);
  const year = zoned.getFullYear();
  const month = `${zoned.getMonth() + 1}`.padStart(2, '0');
  const day = `${zoned.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

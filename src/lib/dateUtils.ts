/**
 * Get date string in YYYY-MM-DD format using IST timezone (India Standard Time)
 * @param date - Date object (defaults to current date)
 * @returns Date string in YYYY-MM-DD format
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(date.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get date string for X days ago in IST timezone
 * @param daysAgo - Number of days to go back
 * @returns Date string in YYYY-MM-DD format
 */
export const getLocalDateStringDaysAgo = (daysAgo: number): string => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  istTime.setUTCDate(istTime.getUTCDate() - daysAgo);
  return getLocalDateString(new Date(istTime.getTime() - istOffset));
};

/**
 * Format date for display (e.g., "Mon, Feb 11")
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export const formatDateDisplay = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // Create date object in local time
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

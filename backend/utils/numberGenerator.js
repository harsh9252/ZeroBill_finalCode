/**
 * Get next number based on last saved number
 * This function extracts the sequence number from the last saved document
 * and returns the next number in sequence
 * Format: PREFIX-YYYY-YY-XXXX (e.g., Q-2026-27-0001)
 */
const getNextNumberFromLast = (lastNumber, prefix) => {

  
  let nextSequence = 1;
  
  if (lastNumber) {
    // Format: PREFIX-YYYY-YY-XXXX (e.g., Q-2026-27-0001)
    const parts = lastNumber.split('-');

    
    if (parts.length === 4) {
      const currentSeq = parseInt(parts[3]);
    
      nextSequence = currentSeq + 1;
  
    } else {
      console.warn('Unexpected number format, parts.length:', parts.length);
    }
  } else {
   
  }
  
  // Get current financial year
  const year = new Date().getFullYear();
  const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
  
  // Format next number: PREFIX-YYYY-YY-XXXX
  const nextNumber = `${prefix}-${financialYear}-${String(nextSequence).padStart(4, '0')}`;
  return {
    nextNumber,
    nextSequence,
    financialYear
  };
};

module.exports = {
  getNextNumberFromLast
};

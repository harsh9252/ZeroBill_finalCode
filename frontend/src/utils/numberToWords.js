/**
 * Utility to convert numbers to words.
 * Supports both Indian (Lakh/Crore) and International (Million/Billion) systems.
 */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertLessThanThousand(n) {
    if (n === 0) return '';
    let result = '';

    if (n >= 100) {
        result += ONES[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
    }

    if (n >= 20) {
        result += TENS[Math.floor(n / 10)] + ' ';
        n %= 10;
    } else if (n >= 10) {
        result += TEENS[n - 10] + ' ';
        return result.trim();
    }

    if (n > 0) {
        result += ONES[n] + ' ';
    }

    return result.trim();
}

/**
 * Convert number to words based on system.
 * @param {number} num 
 * @param {string} system - 'indian' or 'international'
 */
export const numberToWords = (num, system = 'indian') => {
    if (num === 0) return 'Zero';
    if (isNaN(num)) return '';

    let result = '';
    const integerPart = Math.floor(Math.abs(num));

    if (system === 'indian') {
        const crores = Math.floor(integerPart / 10000000);
        const lakhs = Math.floor((integerPart % 10000000) / 100000);
        const thousands = Math.floor((integerPart % 100000) / 1000);
        const hundreds = Math.floor((integerPart % 1000) / 100);
        const remainder = integerPart % 100;

        if (crores > 0) result += convertLessThanThousand(crores) + ' Crore ';
        if (lakhs > 0) result += convertLessThanThousand(lakhs) + ' Lakh ';
        if (thousands > 0) result += convertLessThanThousand(thousands) + ' Thousand ';
        if (hundreds > 0) result += convertLessThanThousand(hundreds) + ' Hundred ';
        if (remainder > 0) result += convertLessThanThousand(remainder);
    } else {
        // International system
        const billions = Math.floor(integerPart / 1000000000);
        const millions = Math.floor((integerPart % 1000000000) / 1000000);
        const thousands = Math.floor((integerPart % 1000000) / 1000);
        const remainder = integerPart % 1000;

        if (billions > 0) result += convertLessThanThousand(billions) + ' Billion ';
        if (millions > 0) result += convertLessThanThousand(millions) + ' Million ';
        if (thousands > 0) result += convertLessThanThousand(thousands) + ' Thousand ';
        if (remainder > 0) result += convertLessThanThousand(remainder);
    }

    return result.trim() + ' Only';
};

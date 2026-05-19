import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';
import { numberToWords } from './numberToWords';

/**
 * Native Vector PDF Generator for Z Khata Book
 * Generates a professional, crisp, and selectable PDF statement.
 */
export const generateKhataHistoryPDF = async ({
    party,
    transactions,
    businessInfo,
    currency,
    language = 'en-IN'
}) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const signatureGreen = [18, 144, 70]; // #129046
        const softGray = [150, 150, 150];

        // --- 1. SETTINGS & HELPERS ---
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let currentY = 15;

        const formatD = (dateStr) => {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const formatC = (v) => {
            const formatted = formatCurrency(v, currency);
            // jsPDF standard fonts don't support the ₹ symbol well, causing the '1' superscript error.
            // Replace ₹ with Rs. for better compatibility.
            return (formatted || '').replace('₹', 'Rs.');
        };

        // --- 2. HEADER: BUSINESS INFO ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(signatureGreen[0], signatureGreen[1], signatureGreen[2]);

        // Wrap business name to prevent overlap with "STATEMENT"
        const maxBusinessWidth = pageWidth / 2;
        doc.text(businessInfo?.business_name || 'MY BUSINESS', margin, currentY, { maxWidth: maxBusinessWidth });

        const businessLines = doc.splitTextToSize(businessInfo?.business_name || 'MY BUSINESS', maxBusinessWidth);
        currentY += (businessLines.length * 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);

        const businessContact = `${businessInfo?.email || ''}  |  ${businessInfo?.phone_number || ''}`;
        doc.text(businessContact, margin, currentY);

        if (businessInfo?.address) {
            currentY += 4;
            doc.text(businessInfo.address, margin, currentY, { maxWidth: 100 });
        }

        // --- 3. DOCUMENT TITLE & DATE ---
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('STATEMENT', pageWidth - margin, 18, { align: 'right' });

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        const now = new Date();
        const genDate = formatD(now);
        const genTime = now.toLocaleTimeString(language);
        doc.text(`Generated: ${genDate} ${genTime}`, pageWidth - margin, 24, { align: 'right' });

        // Border Top Line
        currentY = Math.max(currentY + 8, 32);
        doc.setDrawColor(signatureGreen[0], signatureGreen[1], signatureGreen[2]);
        doc.setLineWidth(0.8);
        doc.line(margin, currentY, pageWidth - margin, currentY);

        // --- 4. PARTY DETAILS ---
        currentY += 8;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('PARTY DETAILS:', margin, currentY);

        doc.setFont('helvetica', 'normal');
        doc.text(party?.party_name || 'N/A', margin + 30, currentY);

        currentY += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('ACCOUNT ID:', margin, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(party?.entry_number || `#${party?.id}`, margin + 30, currentY);

        if (party?.phone_number) {
            currentY += 4;
            doc.setFont('helvetica', 'bold');
            doc.text('CONTACT:', margin, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(party.phone_number, margin + 30, currentY);
        }

        // --- 5. CALCULATION & SUMMARY ---
        const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

        let running = 0;
        let totalIn = 0;
        let totalOut = 0;

        const tableData = sortedTransactions.map(t => {
            const amt = Number(t.amount || 0);
            if (t.type === 'payment_in') {
                running += amt;
                totalIn += amt;
            } else {
                running -= amt;
                totalOut += amt;
            }

            return [
                formatD(t.date || t.created_at),
                t.description || (t.is_opening_balance ? 'Opening Balance' : 'Payment Transaction'),
                t.type === 'payment_out' ? formatC(amt) : '-',
                t.type === 'payment_in' ? formatC(amt) : '-',
                { content: `${formatC(Math.abs(running))} ${running >= 0 ? '(Cr)' : '(Dr)'}`, styles: { fontStyle: 'bold' } }
            ];
        });

        currentY += 10;
        // Summary Box
        doc.setFillColor(245, 250, 247);
        doc.setDrawColor(signatureGreen[0], signatureGreen[1], signatureGreen[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 1, 1, 'FD');

        const sumBoxY = currentY + 5;
        const colWidth = (pageWidth - (margin * 2)) / 3;

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('TOTAL MONEY IN', margin + 10, sumBoxY);
        doc.text('TOTAL MONEY OUT', margin + colWidth + 10, sumBoxY);
        doc.text('NET BALANCE', margin + (colWidth * 2) + 10, sumBoxY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(signatureGreen[0], signatureGreen[1], signatureGreen[2]);
        doc.text(formatC(totalIn), margin + 10, sumBoxY + 4);

        doc.setTextColor(200, 0, 0);
        doc.text(formatC(totalOut), margin + colWidth + 10, sumBoxY + 4);

        const net = totalIn - totalOut;
        doc.setTextColor(net >= 0 ? signatureGreen[0] : 200, net >= 0 ? signatureGreen[1] : 0, net >= 0 ? signatureGreen[2] : 0);
        doc.text(formatC(Math.abs(net)) + (net >= 0 ? ' (Cr)' : ' (Dr)'), margin + (colWidth * 2) + 10, sumBoxY + 4);

        // --- NEW: AMOUNT IN WORDS ---
        currentY += 16;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        // doc.text('NET BALANCE (IN WORDS): ', margin, currentY);

        doc.setFont('helvetica', 'italic');
        doc.setTextColor(50, 50, 50);
        const balanceInWords = numberToWords(Math.abs(net), 'indian');
        // doc.text(balanceInWords, margin + 42, currentY);

        currentY += 6;

        // --- 6. TABLE: jspdf-autotable ---
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Description / Transaction Details', 'Debit (-)', 'Credit (+)', 'Running Balance']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: signatureGreen,
                textColor: [255, 255, 255],
                fontSize: 8, // Reduced from 9
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 28, halign: 'right', textColor: [200, 0, 0] },
                3: { cellWidth: 28, halign: 'right', textColor: [signatureGreen[0], signatureGreen[1], signatureGreen[2]] },
                4: { cellWidth: 32, halign: 'right' }
            },
            styles: {
                fontSize: 8, // Reduced from 8.5
                cellPadding: 1.5,
                font: 'helvetica',
                overflow: 'linebreak'
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
                // Footer on each page
                const str = `Page ${doc.internal.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(str, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
                doc.text('Z Khata Book - Powered by Invoice Bill Book', margin, doc.internal.pageSize.getHeight() - 10);
            }
        });

        // --- 7. SAVE ---
        doc.save(`${party?.party_name || 'khata'}_statement.pdf`);
        return { success: true };
    } catch (error) {
        console.error('Khata PDF Generator Error:', error);
        throw error;
    }
};

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const currencyUtils = require('../utils/currencyUtils');

/**
 * Dedicated service for generating Billing Receipts (PDF)
 * Matches the premium design provided by the user.
 */
class BillingReceiptService {
    static async generateReceiptPDF(billingData, filePath, targetCurrency = 'INR') {
        return new Promise((resolve, reject) => {
            try {
                // Initial setup
                const doc = new PDFDocument({ margin: 0, size: 'A4' });
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // --- Register Fonts ---
                const fontsDir = path.join(__dirname, '../assets/fonts');
                doc.registerFont('Arial', path.join(fontsDir, 'arial.ttf'));
                doc.registerFont('Arial-Bold', path.join(fontsDir, 'arialbd.ttf'));

                // --- Variables ---
                const referenceNumber = billingData.reference_number || billingData.invoiceNumber || 'N/A';
                const date = billingData.created_at || billingData.date || new Date();
                const transactionId = billingData.transaction_id || billingData.transactionId || 'N/A';
                const description = billingData.description || 'Plan Subscription';
                const planType = billingData.plan_type || billingData.planName || 'Plan';
                
                // --- Dynamic Currency Conversion ---
                const rawAmount = parseFloat(billingData.amount || 0);
                const convertedAmount = currencyUtils.convertFromINRSync(rawAmount, targetCurrency);
                const currency = currencyUtils.getCurrencySymbol(targetCurrency);
                const amount = convertedAmount.toFixed(2);

                const paymentStatus = (billingData.payment_status || billingData.paymentStatus || 'success').toUpperCase();
                
                // User Details (Normalizing keys)
                const userName = billingData.first_name ? `${billingData.first_name} ${billingData.last_name || ''}` : (billingData.customerName || 'Customer');
                const userEmail = billingData.email || billingData.customerEmail || '';
                const userPhone = billingData.phone || billingData.customerPhone || '';

                // --- Header (Green Background) ---
                doc.rect(0, 0, 595.28, 115).fill('#129046');
                
                doc.fillColor('#FFFFFF')
                   .font('Arial-Bold')
                   .fontSize(28)
                   .text('InvoiceBillBook', 50, 35);
                
                doc.font('Arial')
                   .fontSize(12)
                   .text('Payment Receipt', 50, 70);

                doc.moveDown(4);

                // --- Receipt Headers (BILL TO & DETAILS) ---
                const topY = 170;
                doc.fillColor('#129046').font('Arial-Bold').fontSize(12);
                doc.text('BILL TO', 50, topY);
                doc.text('RECEIPT DETAILS', 350, topY);

                doc.fillColor('#333333').font('Arial').fontSize(10);
                
                // Bill To Details
                doc.text(userName, 50, topY + 20);
                doc.text(userEmail, 50, topY + 35);
                doc.text(userPhone, 50, topY + 50);

                // Receipt Details
                doc.text(`Receipt #:`, 350, topY + 20);
                doc.text(referenceNumber, 430, topY + 20);
                
                doc.text(`Date:`, 350, topY + 35);
                doc.text(new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' '), 430, topY + 35);
                
                doc.text(`Transaction ID:`, 350, topY + 50);
                doc.text(transactionId, 430, topY + 50);

                // --- Total Amount Paid Highlight ---
                const highlightY = topY + 100;
                doc.rect(50, highlightY, 500, 80).fill('#f9f9f9');
                
                doc.fillColor('#129046')
                   .font('Arial-Bold')
                   .fontSize(16)
                   .text('Total Amount Paid', 50, highlightY + 15, { align: 'center', width: 500 });
                
                doc.fillColor('#333333')
                   .fontSize(28)
                   .text(`${currency} ${amount}`, 50, highlightY + 40, { align: 'center', width: 500 });

                // --- Items Table ---
                const tableY = highlightY + 110;
                
                // Table Header
                doc.rect(50, tableY, 500, 25).fill('#129046');
                doc.fillColor('#FFFFFF').font('Arial-Bold').fontSize(10);
                doc.text('Description', 60, tableY + 8);
                doc.text('Plan', 250, tableY + 8);
                doc.text('Status', 380, tableY + 8);
                doc.text('Amount', 480, tableY + 8);

                // Table Row
                doc.fillColor('#333333').font('Arial').fontSize(9);
                doc.text(description, 60, tableY + 35, { width: 180 });
                doc.text(planType, 250, tableY + 35);
                doc.text(paymentStatus, 380, tableY + 35);
                doc.font('Arial-Bold').text(`${currency} ${amount}`, 480, tableY + 35);

                // --- Absolute Footer (Fixed at Bottom) ---
                const footerY = 760;
                doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#129046').lineWidth(1).stroke();
                
                doc.font('Arial-Bold')
                   .fontSize(14)
                   .fillColor('#129046')
                   .text('Thank you for choosing InvoiceBillBook!', 50, footerY + 15, { align: 'center', width: 500 });
                
                doc.font('Arial')
                   .fontSize(8)
                   .fillColor('#999999')
                   .text('This is a computer generated receipt.', 50, footerY + 40, { align: 'center', width: 500 });

                doc.end();

                stream.on('finish', () => resolve(filePath));
                stream.on('error', (err) => reject(err));

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = BillingReceiptService;

const { pool } = require('../config/database');
const BillingReceiptService = require('../services/BillingReceiptService');
const path = require('path');
const fs = require('fs');

const currentYear = new Date().getFullYear();

const billingController = {
  // Get billing history for a user
  getBillingHistory: async (req, res) => {
    try {
      const userId = req.user.id;

      const query = `
        SELECT
          bh.id,
          bh.plan_type,
          bh.amount,
          bh.currency,
          bh.payment_method,
          bh.transaction_id,
          bh.reference_number,
          bh.payment_status,
          bh.billing_period_start,
          bh.billing_period_end,
          bh.plan_validations,
          bh.description,
          bh.created_at,
          bh.updated_at,
          u.first_name,
          u.last_name,
          u.email
        FROM billing_history bh
        JOIN users u ON bh.user_id = u.id
        WHERE bh.user_id = ?
        ORDER BY bh.created_at DESC
      `;

      const [rows] = await pool.execute(query, [userId]);

      // Helper function to format plan validations
      const formatPlanValidations = (days) => {
        if (!days || days <= 0) return '0 days';

        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);

        let parts = [];
        if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
        if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);

        return parts.join(', ') || `${days} days`;
      };

      // Format the data for frontend
      const formattedHistory = rows.map(row => {
      
        return {
          id: row.id,
          date: new Date(row.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          plan: row.plan_type,
          reference: row.reference_number,
          status: row.payment_status.charAt(0).toUpperCase() + row.payment_status.slice(1),
          amount: parseFloat(row.amount),
          rawAmount: parseFloat(row.amount),
          currency: row.currency,
          paymentMethod: row.payment_method,
          transactionId: row.transaction_id,
          billingPeriodStart: row.billing_period_start,
          billingPeriodEnd: row.billing_period_end,
          planValidations: row.plan_validations || 0,
          planValidationsFormatted: formatPlanValidations(row.plan_validations),
          description: row.description,
          createdAt: row.created_at,
          userCreatedDate: row.created_at, // User created date (same as billing created date)
          userName: `${row.first_name} ${row.last_name}`.trim(),
          userEmail: row.email
        };
      });

      res.json({
        success: true,
        data: formattedHistory,
        message: 'Billing history retrieved successfully'
      });

    } catch (error) {
  
      res.status(500).json({
        success: false,
        message: 'Failed to fetch billing history',
        error: error.message
      });
    }
  },

  // Get billing summary/stats
  getBillingSummary: async (req, res) => {
    try {
      const userId = req.user.id;

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as total_pending,
          MAX(created_at) as last_payment_date
        FROM billing_history 
        WHERE user_id = ?
      `;

      const [summaryRows] = await pool.execute(summaryQuery, [userId]);
      const summary = summaryRows[0];

      // Get current active plan details
      const [planRows] = await pool.query(`
        SELECT pp.name, pp.max_businesses, pp.max_subusers
        FROM billing_history bh
        JOIN pricing_plans pp ON bh.plan_type = pp.name
        WHERE bh.user_id = ? AND bh.payment_status = 'success' AND bh.billing_period_end > NOW()
        ORDER BY bh.billing_period_end DESC
        LIMIT 1
      `, [userId]);

      const activePlan = planRows[0] || { name: 'Starter', max_businesses: 1, max_subusers: 0 };

      // Count current active businesses
      const [businessCountRows] = await pool.query(`
        SELECT COUNT(*) as count FROM businesses WHERE user_id = ?
      `, [userId]);
      const currentBusinessCount = businessCountRows[0].count;

      res.json({
        success: true,
        data: {
          totalTransactions: summary.total_transactions || 0,
          totalPaid: parseFloat(summary.total_paid || 0),
          totalPending: parseFloat(summary.total_pending || 0),
          lastPaymentDate: summary.last_payment_date,
          currentPlan: activePlan.name,
          maxBusinesses: activePlan.max_businesses,
          maxSubusers: activePlan.max_subusers,
          currentBusinessCount
        },
        message: 'Billing summary retrieved successfully'
      });

    } catch (error) {
   
      res.status(500).json({
        success: false,
        message: 'Failed to fetch billing summary',
        error: error.message
      });
    }
  },

  // Download receipt for a specific billing record
  downloadReceipt: async (req, res) => {
    try {
      const userId = req.user.id;
      const billingId = req.params.id;
      const targetCurrency = req.query.currency || 'INR';

      // Get billing record with user details
      const query = `
        SELECT 
          bh.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone
        FROM billing_history bh
        JOIN users u ON bh.user_id = u.id
        WHERE bh.id = ? AND bh.user_id = ?
      `;

      const [rows] = await pool.execute(query, [billingId, userId]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Billing record not found'
        });
      }

      const billingData = rows[0];
      const userData = {
        first_name: billingData.first_name,
        last_name: billingData.last_name,
        email: billingData.email,
        phone: billingData.phone
      };

      // Re-generate PDF on the fly using unified invoiceService
      const fileName = `Plan-Invoice.pdf`;
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const filePath = path.join(tempDir, fileName);

      await BillingReceiptService.generateReceiptPDF(billingData, filePath, targetCurrency);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      res.download(filePath, fileName, (err) => {
        if (err) {
        
        }
        // Optional: delete file after download
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (unlinkError) {
          
        }
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt',
        error: error.message
      });
    }
  },

  // Upgrade user plan
  upgradePlan: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const userId = req.user.id;
      const { planId, paymentMethod, transactionId, amount, currency = 'INR' } = req.body;

      if (!planId) {
        return res.status(400).json({ success: false, message: 'Plan ID is required' });
      }

      await connection.beginTransaction();

      // 1. Get plan details
      const [plans] = await connection.execute('SELECT * FROM pricing_plans WHERE id = ?', [planId]);
      if (plans.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Pricing plan not found' });
      }
      const plan = plans[0];

      // 2. Calculate billing period
      const startDate = new Date();
      const endDate = new Date();
      
      // Calculate end date based on plan period
      if (plan.period === 'year' || plan.period === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (plan.period === 'quarter') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (plan.period === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // Assume daily or fallback
        const days = parseInt(plan.period) || 30;
        endDate.setDate(endDate.getDate() + days);
      }

      // Calculate plan_validations (days)
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 3. Generate unique reference number
      const referenceNumber = `IBB/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(10000 + Math.random() * 90000)}`;

      // 4. Create billing history record
      const [billingResult] = await connection.execute(
        `INSERT INTO billing_history (
          user_id, plan_type, amount, currency, payment_method, 
          transaction_id, reference_number, payment_status, 
          billing_period_start, billing_period_end, plan_validations, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, plan.name, amount || plan.offer_price || plan.price || 0, currency, paymentMethod,
          transactionId, referenceNumber, 'success',
          startDate, endDate, diffDays, `${plan.name} Plan Subscription`
        ]
      );

      // 5. Update user plan status
   
      try {
        await connection.execute(
          `UPDATE users SET 
            is_active = true,
            billing_period_end = ?,
            updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [endDate, userId]
        );
       
      } catch (err) {
       
      }

      await connection.commit();

      // 6. Generate Invoice PDF and Send Email asynchronously
      const [userRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      const userData = userRows[0];
      const billingData = {
        id: billingResult.insertId,
        user_id: userId,
        plan_type: plan.name,
        amount: amount || plan.offer_price || plan.price || 0,
        currency,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        reference_number: referenceNumber,
        payment_status: 'success',
        billing_period_start: startDate,
        billing_period_end: endDate,
        description: `${plan.name} Plan Subscription`
      };

      setImmediate(async () => {
        try {
          const { sendEmail } = require('../utils/nodemailerService');

          const fileName = `Plan-Invoice.pdf`;
          const tempDir = path.join(__dirname, '../temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
          const filePath = path.join(tempDir, fileName);

          await BillingReceiptService.generateReceiptPDF(billingData, filePath);

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #129046 0%, #9ccc53 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Plan Upgraded Successfully!</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <p>Hello <strong>${userData.first_name}</strong>,</p>
                <p>Congratulations! Your plan has been successfully upgraded. Your payment has been processed, and your new plan is now active immediately.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #129046;">Plan Upgrade Details:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                      <td style="padding: 10px 0; color: #666; font-weight: 500;">New Plan:</td>
                      <td style="text-align: right;"><strong style="color: #129046; font-size: 16px;">${plan.name}</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                      <td style="padding: 10px 0; color: #666; font-weight: 500;">Amount Paid:</td>
                      <td style="text-align: right;"><strong>${currency} ${amount}</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                      <td style="padding: 10px 0; color: #666; font-weight: 500;">Invoice Reference:</td>
                      <td style="text-align: right;"><strong>${referenceNumber}</strong></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                      <td style="padding: 10px 0; color: #666; font-weight: 500;">Plan Valid Until:</td>
                      <td style="text-align: right;"><strong style="color: #129046;">${endDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #666; font-weight: 500;">Payment Status:</td>
                      <td style="text-align: right;"><strong style="color: #28a745;">✓ Success</strong></td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #129046; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #2e7d32;"><strong>✓ Your new plan is now active!</strong> You can start using all premium features immediately.</p>
                </div>
                
                <p style="margin-top: 20px;">Your detailed invoice is attached to this email for your records.</p>
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                <p style="margin-top: 20px;">Best regards,<br><strong>The Invoice Bill Book Team</strong></p>
              </div>
              <div style="background-color: #f1f1f1; padding: 15px; text-align: center; color: #999; font-size: 12px;">
                © ${currentYear} Invoice Bill Book. All rights reserved.
              </div>
            </div>
          `;

          await sendEmail(
            userData.email,
            `Plan Upgraded Successfully - ${plan.name} - Invoice ${referenceNumber}`,
            emailHtml,
            [{ filename: fileName, path: filePath }]
          );

          // Clean up
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        } catch (emailError) {
          console.error('Failed to send upgrade confirmation email:', emailError.message);
        }
      });

      res.json({
        success: true,
        message: 'Plan upgraded successfully',
        data: {
          referenceNumber,
          planName: plan.name,
          expiryDate: endDate
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error upgrading plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade plan',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = billingController;

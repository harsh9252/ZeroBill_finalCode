const { pool } = require('../config/database');
const ApprovalWorkflow = require('../models/approvalWorkflowModel');
const PurchaseRequisition = require('../models/purchaseRequisitionModel');
const { sendEmail, initializeEmailService } = require('../utils/nodemailerService');
require('dotenv').config();

// Re-implement the controller logic in simulation to verify it works 100% correctly
const notifyApproversSim = async (prData, targetEmail = null) => {
  let emailToNotify = targetEmail;

  if (!emailToNotify) {
    let levels = [];
    if (prData.approver_sequence) {
      levels = prData.approver_sequence.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    } else {
      levels = [
        prData.level1_email ? prData.level1_email.toLowerCase().trim() : null,
        prData.level2_email ? prData.level2_email.toLowerCase().trim() : null,
        prData.level3_email ? prData.level3_email.toLowerCase().trim() : null
      ].filter(e => e);
    }

    const approvedBy = prData.approved_by ? prData.approved_by.split(',').map(e => e.trim().toLowerCase()) : [];
    if (levels.length === 0) return { skipped: true, reason: 'No levels' };

    if (approvedBy.length < levels.length) {
      emailToNotify = levels[approvedBy.length];
    } else {
      return { skipped: true, reason: 'All approved' };
    }
  }

  const email = emailToNotify.trim().toLowerCase();
  const subject = `Purchase Requisition Approval Required: ${prData.pr_number}`;
  const html = `<p>Simulation: Please approve PR ${prData.pr_number}</p>`;

  try {
    const res = await sendEmail(email, subject, html);
    return { success: true, email, res };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

async function run() {
  try {
    console.log('=== STARTING PR AUTO-UPGRADE SIMULATION ===');
    const businessId = 83;
    const prId = 26;

    // Fetch the current PR state before upgrade
    const currentPR = await PurchaseRequisition.getById(prId, businessId);
    console.log('\n--- PR state BEFORE simulation update ---');
    console.log('ID:', currentPR.id);
    console.log('PR Number:', currentPR.pr_number);
    console.log('Level 1 Email:', currentPR.level1_email);
    console.log('Approver Sequence:', currentPR.approver_sequence);

    // Simulate update payload (empty/null emails from legacy frontends or before configuration)
    const reqBody = {
      level1_email: '',
      level2_email: '',
      level3_email: '',
      approver_sequence: null,
      comments: 'Testing automatic upgrade!'
    };

    console.log('\n--- Running Upgrade Logic ---');
    let approverSequence = reqBody.approver_sequence || currentPR.approver_sequence;
    let lvl1 = reqBody.level1_email !== undefined ? reqBody.level1_email : currentPR.level1_email;
    let lvl2 = reqBody.level2_email !== undefined ? reqBody.level2_email : currentPR.level2_email;
    let lvl3 = reqBody.level3_email !== undefined ? reqBody.level3_email : currentPR.level3_email;

    if ((!approverSequence || approverSequence === '') && (!lvl1 || lvl1 === '') && currentPR.status === 'pending') {
      console.log('Conditions met! Fetching active dynamic approval workflow settings...');
      const workflowLevels = await ApprovalWorkflow.getWorkflow(businessId, 'purchase_requisition');
      if (workflowLevels && workflowLevels.length > 0) {
        console.log(`Found ${workflowLevels.length} active levels in database!`);
        const emails = workflowLevels.map(l => l.approver_email.trim().toLowerCase());
        approverSequence = emails.join(',');
        lvl1 = emails[0] || null;
        lvl2 = emails[1] || null;
        lvl3 = emails[2] || null;
      }
    }

    const updatedData = {
      ...reqBody,
      level1_email: lvl1,
      level2_email: lvl2,
      level3_email: lvl3,
      approver_sequence: approverSequence
    };

    console.log('Updated Data to write:', updatedData);

    console.log('\n--- Writing to Database ---');
    const updated = await PurchaseRequisition.update(prId, businessId, updatedData);
    console.log('Database update result:', updated);

    // Verify upgrade in database
    const upgradedPR = await PurchaseRequisition.getById(prId, businessId);
    console.log('\n--- PR state AFTER simulation update ---');
    console.log('ID:', upgradedPR.id);
    console.log('PR Number:', upgradedPR.pr_number);
    console.log('Level 1 Email:', upgradedPR.level1_email);
    console.log('Level 2 Email:', upgradedPR.level2_email);
    console.log('Level 3 Email:', upgradedPR.level3_email);
    console.log('Approver Sequence:', upgradedPR.approver_sequence);

    // Initialize & Notify
    console.log('\n--- Triggering Notification ---');
    initializeEmailService();
    const notifyRes = await notifyApproversSim(upgradedPR);
    console.log('Notification result:', notifyRes);

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    process.exit(0);
  }
}

run();

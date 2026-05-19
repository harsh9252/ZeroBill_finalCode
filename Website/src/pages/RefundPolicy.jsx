import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

const RefundPolicy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-page-wrapper">
            <div className="legal-content-box">
                <h1 className="legal-title">Cancellation and Refund Policy</h1>

                <div className="legal-body">
                    <p>
                        This Cancellation and Refund Policy shall apply to any cancellation of subscription of the <strong>invoicebillbook</strong> Products and applicable refunds. <strong>invoicebillbook</strong> shall not entertain any refund requests if cancellation of subscription is in violation of this policy or its Terms of Service or if <strong>invoicebillbook</strong> terminates the User account for violation of its Terms of Service.
                    </p>

                    <p>
                        This Cancellation and Refund Policy is a part of and is to be read along with the <Link to="/terms-conditions" className="legal-link">Terms of Service</Link>. Capitalized terms used in this policy but not defined shall have the meanings assigned to them in the Terms of Service.
                    </p>

                    <p>
                        A User may cancel their subscription at any time if they are not satisfied with the product or service. Please note that refunds are not applicable for monthly subscription plans.
                    </p>

                    <p>
                        <strong>invoicebillbook</strong> shall be liable to refund the subscription consideration only if the cancellation is made during the applicable "Refund Period", as set out below:
                        <br />
                        (a) where the initial purchase of the subscription has been assisted by an authorised <strong>invoicebillbook</strong> sales agent, within 7 days from the Account Setup appointment; or
                        <br />
                        (b) where the initial purchase of the subscription is made either directly by the User or through any sales channel other than as mentioned in (a) above, within 7 days from the date of purchase of the subscription (as mentioned on the invoice).
                    </p>

                    <h3>For the avoidance of doubt:</h3>
                    <ul>
                        <li>A User can only avail refund once and for an amount no more than the total subscription consideration paid to <strong>invoicebillbook</strong>;</li>
                        <li>Refunds are not applicable for subscription renewals;</li>
                        <li>Refunds are not applicable on purchase of upgrades by a User during the subscription term, unless the upgrade is purchased during the Refund Period;</li>
                        <li>Referral benefits and coupons cannot be applied to monthly subscription plans.</li>
                    </ul>

                    <p>
                        All requests for cancellation of subscription and refund should be raised only via the customer support helpline provided by <strong>invoicebillbook</strong>. Cancellation and refund requests raised through any other mode of communication will not be considered for refund.
                    </p>

                    <p>
                        <strong>invoicebillbook</strong> has arrangements with banks, affiliates, payment gateways, payment aggregators and other financial service providers for processing refunds ("Service Providers"). <strong>invoicebillbook</strong> endeavors to ensure that eligible refunds are processed within 20 working days of your request for cancellation of subscription. However, this timeline is indicative and processing of refunds is subject to the time taken by the Service Providers. The User shall provide such information as may be required to facilitate refunds including but not limited to bank account details, bank branch details, UPI addresses, IFSC codes etc. <strong>invoicebillbook</strong> is committed to fulfilling its obligations in a timely manner.
                    </p>

                    <h3>Contact Information</h3>
                    <div className="legal-info-card">
                        <strong>Company Name:</strong> Zero Bills Energy Pvt Ltd<br />
                        <strong>Email:</strong> <a href="mailto:support@invoicebillbook.com" className="legal-link">support@invoicebillbook.com</a><br />
                        <strong>Phone:</strong> <a href="tel:+919266242121" className="legal-link">+91-9266242121</a><br />
                        <strong>Address:</strong> URB Trade Centre A-116, 1st floor, Noida Sector 132, U.P, India -201304
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;

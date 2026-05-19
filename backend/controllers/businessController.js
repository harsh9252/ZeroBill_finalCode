const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { createBusinessFolder, sanitizeFolderName } = require('../utils/fileUtils');
const User = require('../models/userModel');
const Business = require('../models/businessModel');
const { pool } = require('../config/database');


exports.createBusiness = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      businessName,
      comment,
      businessType,
      industryType,
      businessRegistrationType,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      gstin,
      vatNumber,
      pan,
      website,
      logoUrl,
      signatureUrl,
      stampUrl,
      is_email_verified,
      taxType
    } = req.body;

    const userId = req.user.id;

    // 1. Get user's plan limits
    const [planRows] = await pool.query(`
      SELECT pp.max_businesses 
      FROM billing_history bh
      JOIN pricing_plans pp ON bh.plan_type = pp.name
      WHERE bh.user_id = ? AND bh.payment_status = 'success' AND bh.billing_period_end > NOW()
      ORDER BY bh.billing_period_end DESC
      LIMIT 1
    `, [userId]);

    const maxBusinesses = planRows.length > 0 ? planRows[0].max_businesses : 1; // Default to 1 if no active plan or found

    // 2. Count current active businesses
    const currentBusinessCount = await Business.getCountByUserId(userId);

    if (maxBusinesses !== -1 && currentBusinessCount >= maxBusinesses) {
      return res.status(403).json({
        success: false,
        message: `Business limit reached for your current plan. You can create up to ${maxBusinesses} business${maxBusinesses > 1 ? 'es' : ''}. Please upgrade your plan or contact support.`
      });
    }

    // Check if GSTIN already exists (if provided)
    if (gstin) {

      const existingBusiness = await Business.findByGSTIN(gstin);
      if (existingBusiness) {

        return res.status(400).json({
          success: false,
          message: 'Business with this GSTIN already exists'
        });
      }
    }

    const business = await Business.create({
      userId: req.user.id,
      businessName,
      comment,
      businessType,
      industryType,
      businessRegistrationType,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      gstin,
      vatNumber,
      pan,
      website,
      logoUrl,
      signatureUrl,
      stampUrl,
      is_email_verified,
      tax_type: taxType || 'No'
    });

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: business
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      details: error.stack
    });
  }
};

exports.getBusinesses = async (req, res) => {
  try {
    let businesses;
    let maxBusinesses = 1; // Default for non-logged in or basic

    if (req.user.isSubUser) {
      // Sub-user: only get businesses they have access to
      const SubUser = require('../models/subUserModel');
      businesses = await SubUser.getAccessibleBusinesses(req.user.id);
      
      // Get parent user's plan limits for sub-users
      const targetUserId = req.user.parentUserId || req.user.parent_user_id;
      if (targetUserId) {
        const [planRows] = await pool.query(`
          SELECT pp.max_businesses 
          FROM billing_history bh
          JOIN pricing_plans pp ON bh.plan_type = pp.name
          WHERE bh.user_id = ? AND bh.payment_status = 'success' AND bh.billing_period_end > NOW()
          ORDER BY bh.billing_period_end DESC
          LIMIT 1
        `, [targetUserId]);
        
        maxBusinesses = planRows.length > 0 ? planRows[0].max_businesses : 1;
      }
    } else {
      // Main user: get all their businesses
      businesses = await Business.findByUserId(req.user.id);

      // Get user's plan limits
      const [planRows] = await pool.query(`
        SELECT pp.max_businesses 
        FROM billing_history bh
        JOIN pricing_plans pp ON bh.plan_type = pp.name
        WHERE bh.user_id = ? AND bh.payment_status = 'success' AND bh.billing_period_end > NOW()
        ORDER BY bh.billing_period_end DESC
        LIMIT 1
      `, [req.user.id]);

      maxBusinesses = planRows.length > 0 ? planRows[0].max_businesses : 1;
    }

    res.status(200).json({
      success: true,
      count: businesses.length,
      maxBusinesses,
      data: businesses
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single business by ID
// @route   GET /api/businesses/:id
// @access  Private
exports.getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check access based on user type
    if (req.user.isSubUser) {
      // Sub-user: check if they have access to this business
      if (!req.user.accessibleBusinessIds.includes(business.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this business'
        });
      }
    } else {
      // Main user: check if business belongs to them
      if (business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this business'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: business
    });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update business
// @route   PUT /api/businesses/:id
// @access  Private
exports.updateBusiness = async (req, res) => {
  try {
    const businessId = req.params.id || req.params.businessId;


    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check access based on user type
    if (req.user.isSubUser) {
      // Sub-user: check if they have access to this business
      if (!req.user.accessibleBusinessIds.includes(business.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this business'
        });
      }
    } else {
      // Main user: check if business belongs to them
      if (business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this business'
        });
      }
    }

    // Prepare update data
    let updateData = { ...req.body };
    if (req.body.taxType) {
      updateData.tax_type = req.body.taxType;
    }
    // Handle file uploads if present
    if (req.files) {
      // Construct the business-specific folder path part
      const sanitizedName = sanitizeFolderName(req.body.businessName || business.business_name);
      const ownerEmail = req.user.ownerEmail || req.user.email;
      const businessPath = `${ownerEmail}/${sanitizedName}`;

      // Ensure the business folder exists
      const targetDir = createBusinessFolder(ownerEmail, req.body.businessName || business.business_name);

      // Handle logo upload
      if (req.files.logo && req.files.logo[0]) {
        const logoFile = req.files.logo[0];
        const newPath = path.join(targetDir, logoFile.filename);

        // Move the file from root uploads to business subfolder
        try {
          fs.renameSync(logoFile.path, newPath);
          const logoUrl = `/uploads/${businessPath}/${logoFile.filename}`;
          updateData.logo_url = logoUrl;
        } catch (err) {
          console.error('Error moving logo file:', err);
          // Fallback to root path if move fails
          updateData.logo_url = `/uploads/${logoFile.filename}`;
        }
      }

      // Handle signature upload
      if (req.files.signature && req.files.signature[0]) {
        const signatureFile = req.files.signature[0];
        const newPath = path.join(targetDir, signatureFile.filename);

        try {
          fs.renameSync(signatureFile.path, newPath);
          const signatureUrl = `/uploads/${businessPath}/${signatureFile.filename}`;
          updateData.signature_url = signatureUrl;
        } catch (err) {
          console.error('Error moving signature file:', err);
          updateData.signature_url = `/uploads/${signatureFile.filename}`;
        }
      }

      // Handle stamp upload
      if (req.files.stamp && req.files.stamp[0]) {
        const stampFile = req.files.stamp[0];
        const newPath = path.join(targetDir, stampFile.filename);

        try {
          fs.renameSync(stampFile.path, newPath);
          const stampUrl = `/uploads/${businessPath}/${stampFile.filename}`;
          updateData.stamp_url = stampUrl;
        } catch (err) {
          console.error('Error moving stamp file:', err);
          updateData.stamp_url = `/uploads/${stampFile.filename}`;
        }
      }
    }

    // Handle explicit removal of images (when frontend sends empty string)
    if (req.body.logo_url === '') updateData.logo_url = null;
    if (req.body.signature_url === '') updateData.signature_url = null;
    if (req.body.stamp_url === '') updateData.stamp_url = null;

    const additionalFields = [
      'msme_number',
      'cin_number',
      'tan_number',
      'udyam_number',
      'import_export_code',
      'fssai_number',
      'drug_license_number',
      'tax_type'
    ];

    additionalFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Explicitly handle is_email_verified from req.body
    if (req.body.is_email_verified !== undefined) {
      // Convert string "1"/"0" to boolean/number if necessary
      updateData.is_email_verified = req.body.is_email_verified == '1' || req.body.is_email_verified == true ? 1 : 0;
    }



    // Check if GSTIN is being changed and already exists
    if (updateData.gstin && updateData.gstin !== business.gstin) {
      const existingBusiness = await Business.findByGSTIN(updateData.gstin);
      if (existingBusiness) {
        return res.status(400).json({
          success: false,
          message: 'Business with this GSTIN already exists'
        });
      }
    }

    const updatedBusiness = await Business.update(
      businessId,
      req.user.id || req.user.parentUserId, // Handle both sub-user and main user
      updateData
    );

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      data: updatedBusiness
    });
  } catch (error) {
    console.error('Update business error:', error);

    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }

    if (error.message && error.message.includes('Only image files are allowed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete business (soft delete)
// @route   DELETE /api/businesses/:id
// @access  Private
exports.deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check access based on user type
    if (req.user.isSubUser) {
      // Sub-user: check if they have access to this business
      if (!req.user.accessibleBusinessIds.includes(business.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this business'
        });
      }
    } else {
      // Main user: check if business belongs to them
      if (business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this business'
        });
      }
    }

    const businessId = req.params.id;

    // 1. Identify sub-users linked to this business before deleting access
    const [subUsersToCleanup] = await pool.query(
      'SELECT sub_user_id FROM sub_user_business_access WHERE business_id = ?',
      [businessId]
    );

    // 2. Perform the soft delete on the business
    await Business.delete(businessId, req.user.id);

    // 3. Remove access records for all sub-users
    await pool.query(
      'DELETE FROM sub_user_business_access WHERE business_id = ?',
      [businessId]
    );

    // 4. Reset permissions for sub-users who now have 0 businesses
    for (const row of subUsersToCleanup) {
      const subUserId = row.sub_user_id;
      const [remaining] = await pool.query(
        'SELECT COUNT(*) as count FROM sub_user_business_access WHERE sub_user_id = ?',
        [subUserId]
      );

      if (remaining[0].count === 0) {
        // Clear global permissions if no businesses left
        await pool.query(
          'UPDATE sub_users SET permissions = NULL WHERE id = ?',
          [subUserId]
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Business deleted and sub-user permissions cleaned up successfully'
    });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle business active status
// @route   PATCH /api/businesses/:id/toggle
// @access  Private
exports.toggleBusinessStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check access based on user type
    if (req.user.isSubUser) {
      // Sub-user: check if they have access to this business
      if (!req.user.accessibleBusinessIds.includes(business.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this business'
        });
      }
    } else {
      // Main user: check if business belongs to them
      if (business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this business'
        });
      }
    }

    await Business.toggleActive(req.params.id, req.user.id);
    const updatedBusiness = await Business.findById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Business status updated successfully',
      data: updatedBusiness
    });
  } catch (error) {
    console.error('Toggle business status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get city details by pincode/zipcode
// @route   GET /api/businesses/pincode/:pincode
// @access  Private
exports.getCityByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    const country = req.query.country || 'India';

    // Country to ISO mapping (partial for common lookups)
    const countryISO = {
      'India': 'IN',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Mexico': 'MX',
      'Brazil': 'BR',
      'Australia': 'AU',
      'Pakistan': 'PK',
      'Bangladesh': 'BD',
      'Sri Lanka': 'LK',
      'Nepal': 'NP'
    };

    const isoCode = countryISO[country];

    const fetchData = async (url) => {
      try {
        if (typeof fetch !== 'undefined') {
          const response = await fetch(url);
          if (!response.ok) return null;
          return await response.json();
        } else {
          const https = require('https');
          return await new Promise((resolve) => {
            https.get(url, (res) => {
              if (res.statusCode !== 200) return resolve(null);
              let body = '';
              res.on('data', (chunk) => body += chunk);
              res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
              });
            }).on('error', () => resolve(null));
          });
        }
      } catch (e) { return null; }
    };

    let data = null;
    let detectedCountry = isoCode ? country : null;

    // 1. Try specified country if it exists
    if (isoCode) {
      if (isoCode === 'IN' && /^\d{6}$/.test(pincode)) {
        data = await fetchData(`https://api.postalpincode.in/pincode/${pincode}`);
        if (data && data[0] && data[0].Status === 'Success') detectedCountry = 'India';
      } else if (isoCode !== 'IN') {
        data = await fetchData(`https://api.zippopotam.us/${isoCode.toLowerCase()}/${pincode}`);
        if (data && data.places && data.places.length > 0) detectedCountry = country;
      }
    }

    // 2. Auto-detect if no data yet or country was invalid/empty
    const pincodeStr = pincode.toString().trim();
    if (!data || (Array.isArray(data) && data[0].Status !== 'Success') || (data.places && data.places.length === 0)) {
      // If 6 digits, highly likely India
      if (/^\d{6}$/.test(pincodeStr)) {
        const indiaData = await fetchData(`https://api.postalpincode.in/pincode/${pincodeStr}`);
        if (indiaData && indiaData[0] && indiaData[0].Status === 'Success') {
          data = indiaData;
          detectedCountry = 'India';
        }
      }

      // If still no data and 5 digits, try USA or other common ones
      if (!data || (Array.isArray(data) && data[0]?.Status !== 'Success')) {
        const fallbacks = pincodeStr.length === 5 ? ['US', 'DE', 'FR', 'IT', 'ES'] : ['US'];
        for (const code of fallbacks) {
          const fbData = await fetchData(`https://api.zippopotam.us/${code.toLowerCase()}/${pincodeStr}`);
          if (fbData && fbData.places && fbData.places.length > 0) {
            data = fbData;
            detectedCountry = Object.keys(countryISO).find(key => countryISO[key] === code);
            break;
          }
        }
      }
    }

    if (!detectedCountry) detectedCountry = country || 'India';

    // Process data based on detected source
    if (detectedCountry === 'India') {
      if (!data || data.length === 0 || data[0].Status !== 'Success') {
        return res.status(404).json({
          success: false,
          message: 'Invalid pincode or no data found'
        });
      }
      const postOffice = data[0].PostOffice[0];
      return res.status(200).json({
        success: true,
        data: {
          pincode: pincode,
          city: postOffice.District,
          state: postOffice.State,
          area: postOffice.Name,
          country: 'India'
        }
      });
    } else {
      // Zippopotam.us format
      if (!data || !data.places || data.places.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data found for this zipcode in selected country'
        });
      }
      const place = data.places[0];
      return res.status(200).json({
        success: true,
        data: {
          pincode: pincode,
          city: place['place name'],
          state: place['state'],
          area: place['place name'],
          country: detectedCountry
        }
      });
    }
  } catch (error) {
    console.error('Get city by pincode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get cities by state
// @route   GET /api/businesses/cities/:state
// @access  Private
exports.getCitiesByState = async (req, res) => {
  try {
    const { state } = req.params;

    // State to cities mapping
    const stateCitiesMap = {
      'Andhra Pradesh': [
        'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry',
        'Tirupati', 'Kadapa', 'Anantapur', 'Vizianagaram', 'Eluru', 'Ongole',
        'Chittoor', 'Machilipatnam', 'Adoni', 'Tenali', 'Proddatur', 'Hindupur'
      ],
      'Arunachal Pradesh': [
        'Itanagar', 'Naharlagun', 'Pasighat', 'Tezpur', 'Bomdila', 'Ziro',
        'Along', 'Tezu', 'Changlang', 'Khonsa', 'Namsai', 'Seppa'
      ],
      'Assam': [
        'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia',
        'Tezpur', 'Bongaigaon', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta',
        'North Lakhimpur', 'Mangaldoi', 'Diphu', 'Haflong'
      ],
      'Bihar': [
        'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga',
        'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra',
        'Danapur', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan'
      ],
      'Chhattisgarh': [
        'Raipur', 'Bhilai', 'Korba', 'Bilaspur', 'Durg', 'Rajnandgaon',
        'Jagdalpur', 'Raigarh', 'Ambikapur', 'Mahasamund', 'Dhamtari', 'Chirmiri'
      ],
      'Goa': [
        'Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda', 'Bicholim',
        'Curchorem', 'Sanquelim', 'Cuncolim', 'Quepem'
      ],
      'Gujarat': [
        'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
        'Junagadh', 'Gandhinagar', 'Anand', 'Navsari', 'Morbi', 'Nadiad',
        'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar', 'Palanpur',
        'Valsad', 'Vapi', 'Gondal', 'Veraval', 'Godhra', 'Patan'
      ],
      'Haryana': [
        'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
        'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa',
        'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Narnaul'
      ],
      'Himachal Pradesh': [
        'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Baddi',
        'Nahan', 'Paonta Sahib', 'Sundernagar', 'Chamba', 'Una', 'Kullu',
        'Hamirpur', 'Bilaspur', 'Kangra', 'Nurpur'
      ],
      'Jharkhand': [
        'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Phusro',
        'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda', 'Chaibasa'
      ],
      'Karnataka': [
        'Bangalore', 'Mysore', 'Hubli-Dharwad', 'Mangalore', 'Belgaum', 'Gulbarga',
        'Davanagere', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur', 'Raichur',
        'Bidar', 'Hospet', 'Hassan', 'Gadag-Betageri', 'Udupi', 'Bhadravati'
      ],
      'Kerala': [
        'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad',
        'Alappuzha', 'Malappuram', 'Kannur', 'Kasaragod', 'Kottayam', 'Pathanamthitta',
        'Idukki', 'Wayanad', 'Ernakulam', 'Thalassery', 'Ponnani', 'Vatakara'
      ],
      'Madhya Pradesh': [
        'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas',
        'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa',
        'Bhind', 'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Chhatarpur'
      ],
      'Maharashtra': [
        'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur',
        'Amravati', 'Kolhapur', 'Sangli', 'Malegaon', 'Akola', 'Latur', 'Dhule',
        'Ahmednagar', 'Chandrapur', 'Parbhani', 'Jalgaon', 'Bhiwandi', 'Nanded',
        'Warangal', 'Ulhasnagar', 'Belgaum', 'Jalna'
      ],
      'Manipur': [
        'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Senapati', 'Ukhrul',
        'Chandel', 'Tamenglong', 'Jiribam'
      ],
      'Meghalaya': [
        'Shillong', 'Tura', 'Cherrapunji', 'Jowai', 'Baghmara', 'Nongpoh',
        'Mawkyrwat', 'Resubelpara', 'Ampati'
      ],
      'Mizoram': [
        'Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip',
        'Mamit', 'Lawngtlai'
      ],
      'Nagaland': [
        'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto',
        'Phek', 'Kiphire', 'Longleng', 'Peren', 'Mon'
      ],
      'Odisha': [
        'Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri',
        'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Barbil',
        'Khordha', 'Sunabeda', 'Rayagada', 'Kendujhar'
      ],
      'Punjab': [
        'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali',
        'Firozpur', 'Batala', 'Pathankot', 'Moga', 'Abohar', 'Malerkotla',
        'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Rajpura', 'Hoshiarpur'
      ],
      'Rajasthan': [
        'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara',
        'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Kishangarh',
        'Baran', 'Dhaulpur', 'Tonk', 'Beawar', 'Hanumangarh'
      ],
      'Sikkim': [
        'Gangtok', 'Namchi', 'Geyzing', 'Mangan', 'Jorethang', 'Naya Bazar',
        'Rangpo', 'Singtam'
      ],
      'Tamil Nadu': [
        'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
        'Tiruppur', 'Vellore', 'Erode', 'Thoothukkudi', 'Dindigul', 'Thanjavur',
        'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil',
        'Kanchipuram', 'Kumarakonam', 'Pudukkottai', 'Ambur'
      ],
      'Telangana': [
        'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam',
        'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Jagtial',
        'Mancherial', 'Nirmal', 'Kothagudem', 'Bodhan'
      ],
      'Tripura': [
        'Agartala', 'Dharmanagar', 'Udaipur', 'Kailasahar', 'Belonia', 'Khowai',
        'Pratapgarh', 'Ranirbazar', 'Sonamura', 'Kumarghat'
      ],
      'Uttar Pradesh': [
        'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad',
        'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida',
        'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Rampur', 'Shahjahanpur',
        'Farrukhabad', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr',
        'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli'
      ],
      'Uttarakhand': [
        'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani-cum-Kathgodam', 'Rudrapur',
        'Kashipur', 'Rishikesh', 'Pithoragarh', 'Ramnagar', 'Manglaur',
        'Nainital', 'Mussoorie', 'Tehri', 'Pauri', 'Bageshwar'
      ],
      'West Bengal': [
        'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Malda', 'Bardhaman',
        'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian',
        'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur',
        'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling'
      ],
      // Union Territories
      'Andaman and Nicobar Islands': [
        'Port Blair', 'Bamboo Flat', 'Garacharma', 'Diglipur', 'Rangat',
        'Mayabunder', 'Campbell Bay', 'Car Nicobar', 'Hut Bay'
      ],
      'Chandigarh': [
        'Chandigarh'
      ],
      'Dadra and Nagar Haveli and Daman and Diu': [
        'Daman', 'Diu', 'Silvassa', 'Vapi', 'Dadra', 'Nagar Haveli'
      ],
      'Delhi': [
        'New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Lajpat Nagar',
        'Karol Bagh', 'Connaught Place', 'Saket', 'Vasant Kunj', 'Pitampura',
        'Preet Vihar', 'Mayur Vihar', 'Laxmi Nagar', 'Rajouri Garden'
      ],
      'Jammu and Kashmir': [
        'Srinagar', 'Jammu', 'Baramulla', 'Anantnag', 'Sopore', 'KathuaA',
        'Rajauri', 'Punch', 'Udhampur', 'Leh', 'Kargil', 'Kupwara'
      ],
      'Ladakh': [
        'Leh', 'Kargil', 'Nubra', 'Zanskar', 'Drass', 'Turtuk'
      ],
      'Lakshadweep': [
        'Kavaratti', 'Agatti', 'Minicoy', 'Amini', 'Andrott', 'Kalpeni'
      ],
      'Puducherry': [
        'Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Oulgaret', 'Villianur'
      ]
    };

    const cities = stateCitiesMap[state];

    if (!cities) {
      return res.status(404).json({
        success: false,
        message: 'State not found or no cities available'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        state: state,
        cities: cities.map(city => ({ label: city, value: city }))
      }
    });
  } catch (error) {
    console.error('Get cities by state error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get voucher settings (prefixes and sequences)
// @route   GET /api/business/voucher-settings/:businessId
// @access  Private
exports.getVoucherSettings = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const year = new Date().getFullYear();
    const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;

    // Get all sequences for this business and current financial year
    const [rows] = await pool.execute(
      'SELECT * FROM invoice_sequences WHERE business_id = ? AND financial_year = ?',
      [businessId, financialYear]
    );

    // Also get the hardcoded defaults to merge if missing in DB
    const { INVOICE_PREFIXES } = require('../utils/invoiceSequenceGenerator');
    
    const settings = Object.keys(INVOICE_PREFIXES).map(type => {
      const existing = rows.find(r => r.invoice_type === type);
      return {
        invoice_type: type,
        prefix: existing ? existing.prefix : INVOICE_PREFIXES[type],
        current_number: existing ? existing.current_number : 0,
        financial_year: financialYear
      };
    });

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get voucher settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update voucher settings
// @route   PUT /api/business/voucher-settings/:businessId
// @access  Private
exports.updateVoucherSettings = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { settings } = req.body; // Array of { invoice_type, prefix, current_number }
    const year = new Date().getFullYear();
    const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings data'
      });
    }

    for (const item of settings) {
      const { invoice_type, prefix, current_number } = item;
      
      await pool.execute(
        `INSERT INTO invoice_sequences 
         (business_id, invoice_type, prefix, current_number, financial_year) 
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE prefix = ?, current_number = ?`,
        [businessId, invoice_type, prefix, current_number, financialYear, prefix, current_number]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Voucher settings updated successfully'
    });
  } catch (error) {
    console.error('Update voucher settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset voucher settings to defaults (delete custom ones)
// @route   DELETE /api/business/voucher-settings/:businessId
// @access  Private
exports.deleteVoucherSettings = async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const year = new Date().getFullYear();
    const financialYear = `${year}-${(year + 1).toString().slice(-2)}`;

    await pool.execute(
      'DELETE FROM invoice_sequences WHERE business_id = ? AND financial_year = ?',
      [businessId, financialYear]
    );

    res.status(200).json({
      success: true,
      message: 'Voucher settings reset to defaults successfully'
    });
  } catch (error) {
    console.error('Reset voucher settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

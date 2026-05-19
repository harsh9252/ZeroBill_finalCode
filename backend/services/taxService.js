
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Unified Tax Service - Currently focused on Indian GST via ClearTax.
 * Lookuptax is temporarily disabled as per user request.
 */

// const LOOKUPTAX_API_KEY = 'pat_c92eae4d5162c98de328391f418b8b23a83af93c59e0565f1df1b84e60f216f5';
// const LOOKUPTAX_BASE_URL = 'https://api.lookuptax.com/validate';

/**
 * Validates a Tax ID (GSTIN) using ClearTax
 * @param {string} country_iso - Two-letter country code (e.g., 'IN')
 * @param {string} tin - Tax Identification Number (GSTIN)
 */
exports.validateTaxId = async (country_iso, tin) => {
    try {
      

        // Normalize country input (be lenient with strings like "India")
        const normalized_iso = (country_iso || '').trim().toUpperCase();
        const final_iso = (normalized_iso === 'INDIA' || normalized_iso === 'IN') ? 'IN' : normalized_iso;

        // Only handle India (IN) for now
        if (final_iso === 'IN' || (!final_iso && /^\d{2}/.test(tin))) {
            return await this.validateIndiaGST(tin);
        }

        // Return informative error for other countries while Lookuptax is disabled
        return {
            success: false,
            message: 'Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).'
        };

    } catch (error) {
        console.error('[TaxService] Global Error:', error.message);
        return {
            success: false,
            message: error.message || 'Error during tax validation'
        };
    }
};

/**
 * Specific logic for Indian GSTIN using ClearTax public page scraping
 * Handles both HTML and JSON response formats from ClearTax
 */
exports.validateIndiaGST = async (gstin) => {
    try {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        // Basic Length Check
        if (!gstin || gstin.length !== 15) {
            return {
                success: false,
                message: 'Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).'
            };
        }

        // Regex Format Check
        if (!gstinRegex.test(gstin)) {
            return {
                success: false,
                message: 'Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).'
            };
        }


        
        // Provided by user to bypass blocks/captcha
        const captcha_token = '0cAFcWeA6XsqD9aj0xWkqc19A96jWg9B4w6oQlEQcAJ2LCVXkHy8DkMzdnw88gzMbSsunt-x9kki_U8l_pNodlpaX3ucpyDtBw6PYGl4BaexGJIW3R7hVaZPD-Wql5d40umeEf7kdzP3V-Xy8CzxDNl1fQKQuy3Lmij19LPOGlvhOpcETcuNrSLiBTfDG-fTikhMayr6bNXDB54vTiUUapwxb33u3maa8MEzfeDgx267W-jideoY-OAZ8l26k81QSAlQjrTJpagmHtVNqe9UDYaJC3nAKx02SGc8u8zrTOe_lVZCwmSqcBss0QIo8Yu55zV5vjBfxRP60wuqVnafVFZzXLNEoOapU_Hpapkj4fExJE60S8oIUDA4kqXZBPjSspOwxmyxDPglWX83CSqVbAcYoZ0CzMqYJ7J42ChdelfW9FQBXXY81EkaELs5fMgWtChPC04o3ZTdAYxQIvf2RbWFgJZ9S2CDMXac6sifFpv9Dy-oKfamgHbEBY-tb6_SxQ407-S4nhW7gHurtYbbS4rFCaUvC570j6dgH_qR9AG1TIysiJW1IOzqbSmoBsjBrLxQhM511HP7Gd0TMoFCuVuqrewMvkuCwk-QRJXYmzblKjGVe_8SbT1sVd_P_a5SLmQrcY3W4heyHl1ywhbTzmRugV6qjy89DllPexH0fr7IutxH9WzZUMZCJj_2R0RmxLoQHKOwyP_H83rDUcG_WL7sVM1k7AAIu6VGI7D-8wu_cjx3Jp8WCK00xfpw_Wjdgziw5g6rFQ7FRSlkQ_PsxomB2gIjO9Zfefn9Lc6fPaepP4Gd1KffFmV1vGdChaWC9YNl2GRwczexUqUdYz8A82PPWEq19d50iXoKS56k4IjXkKo_CqhJOKtl_QCZq8a9bHEmbIHZ4pvFam2JXGH-8RV5HDczWdfMpy6NUA5Kt9wfQ3AOHGK6f99Qszhk3bRp8IgX6hk4ndKThsvKAJpbOanc8nVEF93gAyRrseXKcroTDaGaDDDeJKZf-2G6tFapBXaGk8iTZZpf1FvQ7fD5cR6i4RTJA3Zs00X9uBsI6WLprg8bf-7GAc6_68oxWQdRt72m5kTezJypbs3SJoX4jy6YSb4ER1wfkkyuEFLJBrXao5Wan699FEKM8vk9LuFWkkVeCWJuzGqA75c5wpR-C6RkgRhLeTdiQ0uLbOxq7QOl7bdTEsh4D61F8Sg2iih7zGzn2cbS7-PjM8DervoSKUoE7C_QQ0DN0gcr0BsaJ7KjexuQrXVxmgE6jF3BWMnx23cKrI-CTVAcnq0rDivQLRynkS7xzLGasPzbABwKMJUwW5eZURZosyV6p4xsKr17gxSJ2HhhNPAvyV3-oC5ZBhMvapYAGM3-0EET6GpAixOsRqe24JP-w8tExrnyThV7pNlFlVrQwIt7hhXh0-mZi-vgsndtfIjsxPLTJTRYkEDAMJsFSUiPUqZJJGquPOnTqqcRtRKRDyX3OJJBGTrqK8YKGZZihUu39sDwC1VjJxIrF_-GteBfD61USWgGX7nIbyBePEwh8IBPHhApjQUZ-tRVr5CyT2Tj7byLaZV_A4Qz-FWEmYEbxFGv8bf6W6mHPA1E9f_ktuq-WDJeRAvGYdXbUNYMqpnuW2ACw9ERhr3OB2jHEuExY6hO62JEC-rfIZRUT9VvEZKGFl1hhh3Eqd-0iyh8pXbn6Rwhj8ri6OucGFo15l66RoTrDIq6U3kv14rQbvrdtytoz2QrTJRKit0bvjq4EOWPc4fsfxj_SxqlEmYe5Cmx8nJ4kJyesAMCBibLoGHc5XAbyhATLQ9jwAallCL6EHsMmMZRDkxRBLCKggbhWHi7OuvHFpxrNqh2tq2z10GjsaTSOFbjfUcZzk0bdFlt3gTEuwkfn8pKJKCLu6KpfxdeIlLqatsoJHJdXHR0JwpGm1Uzd7lf1eiOsKPzCGUSZNegEc8rLU1hl4xHg-PAsIOMxdJDaXrJnNgYsjMeCDHePVezh501rDWnQDbl675NT8G-vVrjQH4XEemQyvGarOFkrRQsbl4egNxPXJr12CAp5F7v_l0Y8sb96z0ISJjKXftLrILwWuiy9SoHZCWI-D3-3D6haj_2QDqfd_njUN8iO1VN9JcnzFWa73kPLxFI8wxJS3dUv2TV2x8j_77tcCuPRaFbI3A65lyakU2KiOKzTk98vv-_UzpNFSj_xZzNlQOfG-6W4w2BUTO1WbYpRzZAOvMDJBnsfA54Nq_dhOgOYI1Tyo--qmzhGV-f8ClMBD550tQuHUZc1v3APBUEl61cf3O_w';

        // PAN extraction from GSTIN (characters 3 to 12)
        const panNumber = gstin.substring(2, 12);

        // Try with single slash and Referer header
        // Some systems expect /f/compliance-report/{gstin}/
        const cleartaxUrl = `https://cleartax.in/f/compliance-report/${gstin}/`;
        const response = await axios.get(cleartaxUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/html, application/xhtml+xml, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://cleartax.in/s/gst-number-search',
                'Connection': 'keep-alive',
                'captcha_token': captcha_token,
                'x-clear-captcha-token': captcha_token
            }
        });

        let legalName = '';
        let tradeName = '';
        let address = '';
        let city = '';
        let state = '';
        let pincode = '';
        let status = 'Active';

        // Check if response is JSON (ClearTax sometimes returns JSON directly)
        if (typeof response.data === 'object' && response.data !== null) {
          
            const info = response.data.taxpayerInfo || {};
            
            // Map based on user provided sample
            legalName = info.lgnm || '';
            tradeName = info.tradeNam || info.tradeName || legalName;
            
            // Try Principal Address (pradr) first, then Additional Address (adadr)
            let pradr = info.pradr || {};
            let addr = pradr.addr || {};
            
            // Fallback to first additional address if principal is empty
            if ((!addr.bnm && !addr.loc) && info.adadr && info.adadr.length > 0) {
          
                addr = info.adadr[0].addr || {};
            }
            
            const addrParts = [
                addr.bnm, addr.bno, addr.st, addr.loc, addr.dst, addr.stcd
            ].filter(Boolean);
            
            address = addrParts.join(', ');
            city = addr.dst || addr.city || '';
            state = addr.stcd || '';
            pincode = addr.pncd || '';
            status = info.sts || 'Active';
        } 
        // Otherwise handle as HTML
        else if (typeof response.data === 'string') {
        
            const $ = cheerio.load(response.data);
            
            legalName = $('div:contains("Legal Name of Business")').next().text().trim() || 
                        $('strong:contains("Legal Name of Business")').parent().text().replace("Legal Name of Business", "").trim();
            
            tradeName = $('div:contains("Trade Name")').next().text().trim() || legalName;
            
            address = $('div:contains("Principal Place of Business")').next().text().trim();
            status = $('div:contains("GSTIN / UIN Status")').next().text().trim();

            if (address) {
                const parts = address.split(',');
                const lastPart = parts[parts.length - 1].trim();
                const pincodeMatch = lastPart.match(/\d{6}/);
                if (pincodeMatch) pincode = pincodeMatch[0];
                
                if (parts.length >= 2) {
                    state = parts[parts.length - 1].replace(pincode, '').trim().replace('-', '').trim();
                    city = parts[parts.length - 2].trim();
                }
            }
        }

        if (!legalName && !address) {
            return {
                success: false,
                message: 'No data found for this GSTIN on ClearTax'
            };
        }

        return {
            success: true,
            source: 'cleartax',
            taxId: gstin,
            panNumber: panNumber, 
            companyName: legalName || '',
            tradeName: tradeName || '',
            address: address || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            country: 'IN',
            status: status || 'Active'
        };

    } catch (error) {
        console.error('[TaxService] ClearTax Error:', error.message);
        
        // Handle malformed/invalid GSTIN reported by ClearTax (422)
        if (error.response?.status === 422) {
            return {
                success: false,
                message: 'Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).'
            };
        }

        return {
            success: false,
            message: 'Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).'
        };
    }
};

/**
 * International Tax Validation (Temporarily disabled)
 */
exports.validateInternationalTax = async (country_iso, tin) => {
    return {
        success: false,
        message: 'Invalid GSTIN format. Indian GSTIN must be exactly 15 characters long (e.g., 07AAAAA0000A1Z5).'
    };
};

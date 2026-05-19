import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useSearchParams } from 'react-router-dom';
import { contractAPI, businessAPI, contractPageAPI } from '../../../utils/api';
import { countryCodes } from '../../../utils/countryCodes';
import { Plus, Search, FileText, X, Save, ArrowLeft, ChevronDown, Download, Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import { generateUniversalPDF } from '../../../utils/generateUniversalPDF';
import { useReactToPrint } from 'react-to-print';
import ActionButtons from '../../../Components/ActionButtons';
import ReusableTable from '../../../Components/ReusableTable.jsx';
import { showSuccessToast, showErrorToast, showConfirmationDialog, showLoadingModal, closeModal } from '../../../Components/ActionMessageModel';
import TextEditorModal from '../../../Components/TextEditorModal.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure, useDateRange } from '../../../Components/Date_wise_Filter_Button.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import DashboardBackButton from "../../../Components/DashboardBackButton.jsx";
import CommonDropdown from "../../../Components/CustomDropdown.jsx";
import DeleteConfirmationModal from "../../../Components/DeleteConfirmationModal.jsx";







const AgreementPDFTemplate = ({ data }) => {
    return (
        <div className="preview-wrapper agreement-pdf" style={{
            padding: '40px 60px',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: '#000000',
            backgroundColor: '#ffffff',
            width: '100%',
            boxSizing: 'border-box',
            lineHeight: '1.6'
        }}>
            {/* Professional Header */}
            <div style={{ paddingBottom: '15px' }}>
                <h1 style={{
                    fontSize: '26px',
                    fontWeight: 'bold',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    color: '#129046'
                }}>
                    AGREEMENT
                </h1>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Agreement No: {data.contract_number}</p>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Date: {new Date(data.contract_date).toLocaleDateString()}</p>
            </div>

            <div style={{ width: '100%', borderBottom: '2px solid #129046', marginBottom: '20px' }}></div>

            {/* Parties Table - Single Row for all parties */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', tableLayout: 'fixed' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', paddingRight: '15px' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '4px' }}>PARTY 1 :</p>
                            <div style={{ paddingLeft: '2px' }}>
                                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px', color: '#000' }}>{data.party_1_name}</p>
                                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#333', lineHeight: '1.3' }}>{data.party_1_address}</p>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#333' }}>Email: {data.party_1_email}</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#333' }}>Phone: {data.party_1_phone}</p>
                            </div>
                        </td>
                        <td style={{ verticalAlign: 'top', paddingRight: '15px' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '4px' }}>PARTY 2 :</p>
                            <div style={{ paddingLeft: '2px' }}>
                                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px', color: '#000' }}>{data.party_2_name}</p>
                                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#333', lineHeight: '1.3' }}>{data.party_2_address}</p>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#333' }}>Email: {data.party_2_email}</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#333' }}>Phone: {data.party_2_phone}</p>
                            </div>
                        </td>
                        {data.party_3_name && (
                            <td style={{ verticalAlign: 'top' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '4px' }}>PARTY 3 :</p>
                                <div style={{ paddingLeft: '2px' }}>
                                    <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px', color: '#000' }}>{data.party_3_name}</p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#333', lineHeight: '1.3' }}>{data.party_3_address}</p>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#333' }}>Email: {data.party_3_email}</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#333' }}>Phone: {data.party_3_phone}</p>
                                </div>
                            </td>
                        )}
                    </tr>
                </tbody>
            </table>

            {/* Agreement Body */}
            <div style={{ paddingTop: '15px' }}>
                {data.contract_pages && data.contract_pages.length > 0 ? (
                    data.contract_pages.map((page, index) => (
                        <div key={page.id} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                            <h4 style={{
                                fontSize: '15px',
                                fontWeight: 'bold',
                                borderBottom: '2px solid #9ccc53',
                                paddingBottom: '6px',
                                marginBottom: '12px',
                                color: '#129046',
                                textTransform: 'uppercase'
                            }}>
                                {page.heading}
                            </h4>
                            <div
                                className="legal-pdf-content"
                                style={{
                                    fontSize: '13px',
                                    textAlign: 'justify',
                                    lineHeight: '1.4',
                                    color: '#000'
                                }}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}

                            />
                        </div>
                    ))
                ) : (
                    <div
                        className="legal-pdf-content"
                        style={{
                            fontSize: '13px',
                            textAlign: 'justify',
                            lineHeight: '1.4',
                            color: '#000'
                        }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.contract_content) }}

                    />
                )}
            </div>

            {/* Signature Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '100px', tableLayout: 'fixed' }}>
                <tbody>
                    <tr>
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ width: '180px', margin: '0 auto' }}>
                                <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#000' }}>AUTHORIZED SIGNATORY</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#666' }}>(Party 1)</p>
                            </div>
                        </td>
                        <td style={{ width: data.party_3_name ? '20px' : '40px' }}></td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ width: '180px', margin: '0 auto' }}>
                                <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                <p style={{ margin: '0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#000' }}>AUTHORIZED SIGNATORY</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#666' }}>(Party 2)</p>
                            </div>
                        </td>
                        {data.party_3_name && (
                            <>
                                <td style={{ width: '20px' }}></td>
                                <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                                    <div style={{ width: '180px', margin: '0 auto' }}>
                                        <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                        <p style={{ margin: '0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#000' }}>AUTHORIZED SIGNATORY</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#666' }}>(Party 3)</p>
                                    </div>
                                </td>
                            </>
                        )}
                    </tr>
                </tbody>
            </table>

            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                .preview-wrapper.agreement-pdf {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                    -webkit-font-smoothing: antialiased;
                }
                .preview-wrapper.agreement-pdf td { border-bottom: none !important; }
                .preview-wrapper .legal-pdf-content {
                    word-break: normal;
                    overflow-wrap: anywhere;
                    line-height: 1.4;
                    color: #000;
                    font-family: 'Inter', sans-serif !important;
                }
                .preview-wrapper .legal-pdf-content p { margin-bottom: 12px; text-indent: 0; }
                .preview-wrapper .legal-pdf-content td p, .preview-wrapper .legal-pdf-content th p { margin: 0 !important; }
                .preview-wrapper .legal-pdf-content ul, .preview-wrapper .legal-pdf-content ol { padding-left: 30px; margin-bottom: 12px; }
                .preview-wrapper .legal-pdf-content li { margin-bottom: 6px; }
                .preview-wrapper .legal-pdf-content h1, .preview-wrapper .legal-pdf-content h2, .preview-wrapper .legal-pdf-content h3, .preview-wrapper .legal-pdf-content h4 { 
                    margin-top: 25px; 
                    margin-bottom: 12px; 
                    text-transform: uppercase;
                    border-bottom: 2px solid #000;
                    padding-bottom: 5px;
                    font-size: 16px;
                    font-weight: 700;
                    display: block;
                    width: 100%;
                    color: #000;
                }
                .preview-wrapper .legal-pdf-content table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 15px 0 !important;
                    table-layout: auto !important;
                    border: 1.5px solid #000 !important;
                }
                .preview-wrapper .legal-pdf-content th, .preview-wrapper .legal-pdf-content td {
                    border: 1px solid #000 !important;
                    padding: 4px 6px !important;
                    vertical-align: top !important;
                    text-align: left !important;
                    min-width: 60px;
                    color: #000 !important;
                    font-size: 11px;
                    line-height: 1.2 !important;
                }
                .preview-wrapper .legal-pdf-content th {
                    background-color: #f8f8f8 !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    font-size: 11px;
                }
                @media print {
                    @page { margin: 25mm !important; }
                    .preview-wrapper.agreement-pdf { padding: 0 !important; }
                    .preview-wrapper .pdf-page { page-break-after: always; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; min-height: auto !important; }
                    .preview-wrapper .legal-pdf-content { orphans: 4; widows: 4; }
                }
            `}} />
        </div>
    );
};

const Agreement = ({ currency }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState(searchParams.get('mode') || 'list');
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        party_1_name: '',
        party_1_email: '',
        party_1_phone: '',
        party_1_address: '',
        party_2_name: '',
        party_2_email: '',
        party_2_phone: '',
        party_2_address: '',
        party_3_name: '',
        party_3_email: '',
        party_3_phone: '',
        party_3_address: '',
        contract_number: '',
        contract_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        status: 'draft',
        contract_content: ''
    });

    const [phoneCodeDropdowns, setPhoneCodeDropdowns] = useState({
        party1: false,
        party2: false,
        party3: false
    });
    const [phoneCodeSearchTerms, setPhoneCodeSearchTerms] = useState({
        party1: '',
        party2: '',
        party3: ''
    });
    const [phoneCodeHighlightedIndices, setPhoneCodeHighlightedIndices] = useState({
        party1: 0,
        party2: 0,
        party3: 0
    });

    const [party1PhoneCode, setParty1PhoneCode] = useState('+91');
    const [party2PhoneCode, setParty2PhoneCode] = useState('+91');
    const [party3PhoneCode, setParty3PhoneCode] = useState('+91');

    const party1PhoneCodeInputRef = useRef(null);
    const party1PhoneCodeOptionsListRef = useRef(null);
    const party2PhoneCodeInputRef = useRef(null);
    const party2PhoneCodeOptionsListRef = useRef(null);
    const party3PhoneCodeInputRef = useRef(null);
    const party3PhoneCodeOptionsListRef = useRef(null);

    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [errors, setErrors] = useState({});
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // Multi-page Agreement State
    const [pages, setPages] = useState([{ id: Date.now(), heading: 'Agreement Page 1', content: '', page_order: 1, is_locked: 0 }]);
    const [showTextEditor, setShowTextEditor] = useState(false);
    const [editingPageId, setEditingPageId] = useState(null);

    const addNewPage = () => {
        const newPage = {
            id: Date.now(),
            heading: `Agreement Page ${pages.length + 1}`,
            content: '',
            page_order: pages.length + 1,
            is_locked: 0
        };
        setPages([...pages, newPage]);
    };

    const removePage = (id) => {
        if (pages.length === 1) {
            showErrorToast("At least one page is required");
            return;
        }
        setPages(pages.filter(p => p.id !== id));
    };

    const handleTogglePageLock = async (id) => {
        // If it's a temp ID (not saved in DB), just toggle locally
        if (id >= 1000000000) {
            setPages(pages.map(p => p.id === id ? { ...p, is_locked: p.is_locked ? 0 : 1 } : p));
            return;
        }

        try {
            const res = await contractPageAPI.toggleLock(id, businessId);
            if (res.success) {
                setPages(pages.map(p => p.id === id ? { ...p, is_locked: res.is_locked } : p));
                showSuccessToast(res.is_locked ? "Page Locked" : "Page Unlocked");
            }
        } catch (error) {
            console.error('Error toggling page lock:', error);
            showErrorToast("Could not update lock status");
        }
    };


    const [dropdowns, setDropdowns] = useState({
        status: false
    });
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [previewContract, setPreviewContract] = useState(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Validation functions
    const validateName = (name) => {
        if (!name || name.trim().length === 0) return 'Name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z\s\-'.&()]+$/.test(name)) return 'Name can only contain letters, spaces, hyphens, apostrophes, dots, ampersands, and parentheses';
        return '';
    };

    const validateEmail = (email) => {
        if (!email) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Invalid email format';
        return '';
    };

    const validatePhone = (phone) => {
        if (!phone) return '';
        // Truncate logic is handled in handleInputChange, but we still allow up to 40 digits for safety
        if (!/^\d+$/.test(phone)) return 'Phone number can only contain digits';
        if (phone.length > 40) return 'Phone number cannot exceed 40 digits';
        return '';
    };

    const validateContractNumber = (number) => {
        if (!number || number.trim().length === 0) return 'Agreement number is required';
        if (!/^[a-zA-Z0-9\-_/]+$/.test(number)) return 'Agreement number can only contain letters, numbers, hyphens, underscores, and slashes';
        return '';
    };

    const handleInputChange = (field, value) => {
        let cleanValue = value;
        if (field === 'party_1_phone' || field === 'party_2_phone' || field === 'party_3_phone') {
            cleanValue = value.replace(/\D/g, '').slice(0, 40);
        }
        setFormData(prev => ({ ...prev, [field]: cleanValue }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Party 1 validations
        newErrors.party_1_name = validateName(formData.party_1_name);
        newErrors.party_1_email = validateEmail(formData.party_1_email);

        // Party 2 validations
        newErrors.party_2_name = validateName(formData.party_2_name);
        newErrors.party_2_email = validateEmail(formData.party_2_email);

        // Party 3 validations (Optional - only validate if name is provided)
        if (formData.party_3_name && formData.party_3_name.trim()) {
            newErrors.party_3_name = validateName(formData.party_3_name);
            newErrors.party_3_email = validateEmail(formData.party_3_email);
        }

        // Contract number validation
        newErrors.contract_number = validateContractNumber(formData.contract_number);

        // Remove empty error messages
        Object.keys(newErrors).forEach(key => {
            if (!newErrors[key]) delete newErrors[key];
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const { bounds } = useDateRange(dateRangeLabel, customRange);

    const onRangeChange = (label) => {
        setDateRangeLabel(label);
    };

    const onRangeApply = (range) => {
        setCustomRange(range);
        setDateRangeLabel("Custom Date Range");
    };

    const selectPhoneCodeOption = (dialCode, party) => {
        if (party === 'party1') {
            setParty1PhoneCode(dialCode);
        } else if (party === 'party2') {
            setParty2PhoneCode(dialCode);
        } else if (party === 'party3') {
            setParty3PhoneCode(dialCode);
        }
        setPhoneCodeDropdowns(prev => ({ ...prev, [party]: false }));
        setPhoneCodeSearchTerms(prev => ({ ...prev, [party]: '' }));
    };

    const handlePhoneCodeKeyDown = (e, party) => {
        const filtered = countryCodes.filter(c =>
            c.name.toLowerCase().includes(phoneCodeSearchTerms[party].toLowerCase()) ||
            c.dial_code.includes(phoneCodeSearchTerms[party])
        );

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setPhoneCodeHighlightedIndices(prev => ({
                ...prev,
                [party]: Math.min(prev[party] + 1, filtered.length - 1)
            }));
            const item = document.getElementById(`${party}-code-option-${Math.min(phoneCodeHighlightedIndices[party] + 1, filtered.length - 1)}`);
            if (item) item.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setPhoneCodeHighlightedIndices(prev => ({
                ...prev,
                [party]: Math.max(prev[party] - 1, 0)
            }));
            const item = document.getElementById(`${party}-code-option-${Math.max(phoneCodeHighlightedIndices[party] - 1, 0)}`);
            if (item) item.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' && phoneCodeDropdowns[party]) {
            e.preventDefault();
            if (filtered[phoneCodeHighlightedIndices[party]]) {
                selectPhoneCodeOption(filtered[phoneCodeHighlightedIndices[party]].dial_code, party);
            }
        } else if (e.key === 'Escape') {
            setPhoneCodeDropdowns(prev => ({ ...prev, [party]: false }));
        }
    };

    const getFilteredCountryCodes = (party) => {
        return countryCodes.filter(c =>
            c.name.toLowerCase().includes(phoneCodeSearchTerms[party].toLowerCase()) ||
            c.dial_code.includes(phoneCodeSearchTerms[party])
        );
    };

    const toggleDropdown = (key) => {
        setDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const selectDropdownOption = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        setDropdowns((prev) => ({ ...prev, [key]: false }));
    };

    const businessId = localStorage.getItem('selectedBusinessId');

    const fetchContracts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await contractAPI.getAll(businessId);
            if (response.success) {
                setContracts(response.data);
            }
        } catch (error) {
            console.error('Error fetching agreements:', error);
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    const fetchNextAgreementNumber = useCallback(async () => {
        try {
            const response = await contractAPI.getNextNumber(businessId);
            if (response.success && response.data.contract_number) {
                setFormData(prev => ({ ...prev, contract_number: response.data.contract_number }));
            }
        } catch (error) {
            console.error('Error fetching next agreement number:', error);
        }
    }, [businessId]);

    const fetchLockedAgreementPages = useCallback(async () => {
        try {
            const response = await contractPageAPI.getLockedPages(businessId);
            if (response.success && response.data && response.data.length > 0) {
                // Map the template results to initial pages structure for a new agreement
                const templatePages = response.data.map((page, index) => ({
                    id: Date.now() + index,
                    heading: page.heading,
                    content: page.content,
                    page_order: page.page_order,
                    is_locked: 1
                }));
                setPages(templatePages);
            }
        } catch (error) {
            console.error('Error fetching template locked pages:', error);
        }
    }, [businessId]);
    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    // Listen for business changes and refetch contracts
    useEffect(() => {
        const handleBusinessChanged = (event) => {
            fetchContracts();
        };

        window.addEventListener('businessChanged', handleBusinessChanged);
        return () => {
            window.removeEventListener('businessChanged', handleBusinessChanged);
        };
    }, [fetchContracts]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.custom-dropdown')) {
                setDropdowns({
                    partyId: false,
                    status: false
                });
            }
            if (!event.target.closest('[data-dropdown="party1PhoneCode"]')) {
                setPhoneCodeDropdowns(prev => ({ ...prev, party1: false }));
            }
            if (!event.target.closest('[data-dropdown="party2PhoneCode"]')) {
                setPhoneCodeDropdowns(prev => ({ ...prev, party2: false }));
            }
            if (!event.target.closest('[data-dropdown="party3PhoneCode"]')) {
                setPhoneCodeDropdowns(prev => ({ ...prev, party3: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);





    const handleEdit = useCallback((contract, updateUrl = true) => {
        // Parse phone codes from existing combined phone strings
        const p1Full = contract.party_1_phone || '';
        let p1Code = '+91';
        let p1Num = p1Full;
        if (p1Full.includes(' ')) {
            const parts = p1Full.split(' ');
            p1Code = parts[0];
            p1Num = parts.slice(1).join(' ');
        }

        const p2Full = contract.party_2_phone || '';
        let p2Code = '+91';
        let p2Num = p2Full;
        if (p2Full.includes(' ')) {
            const parts = p2Full.split(' ');
            p2Code = parts[0];
            p2Num = parts.slice(1).join(' ');
        }

        const p3Full = contract.party_3_phone || '';
        let p3Code = '+91';
        let p3Num = p3Full;
        if (p3Full.includes(' ')) {
            const parts = p3Full.split(' ');
            p3Code = parts[0];
            p3Num = parts.slice(1).join(' ');
        }

        setParty1PhoneCode(p1Code);
        setParty2PhoneCode(p2Code);
        setParty3PhoneCode(p3Code);

        // Attempt to parse existing data if they are stored in fields, otherwise reset
        setFormData({
            party_1_name: contract.party_1_name || '',
            party_1_email: contract.party_1_email || '',
            party_1_phone: p1Num,
            party_1_address: contract.party_1_address || '',
            party_2_name: contract.party_2_name || '',
            party_2_email: contract.party_2_email || '',
            party_2_phone: p2Num,
            party_2_address: contract.party_2_address || '',
            party_3_name: contract.party_3_name || '',
            party_3_email: contract.party_3_email || '',
            party_3_phone: p3Num,
            party_3_address: contract.party_3_address || '',
            contract_number: contract.contract_number || '',
            contract_date: contract.contract_date ? contract.contract_date.split('T')[0] : '',
            expiry_date: contract.expiry_date ? contract.expiry_date.split('T')[0] : '',
            status: contract.status || 'draft',
            contract_content: contract.contract_content || ''
        });

        setEditingId(contract.id);

        // Load pages if they exist
        if (contract.contract_pages && contract.contract_pages.length > 0) {
            setPages(contract.contract_pages);
        } else {
            setPages([{
                id: Date.now(),
                heading: 'Agreement Page 1',
                content: contract.contract_content || '',
                page_order: 1,
                is_locked: 0
            }]);
        }

        if (updateUrl) {
            setSearchParams({ mode: 'edit', id: contract.id });
        }
    }, [setSearchParams]);

    useEffect(() => {
        const mode = searchParams.get('mode') || 'list';
        setViewMode(mode);

        if (mode === 'list' || mode === 'create') {
            setEditingId(null);
            setFormData({
                party_1_name: '', party_1_email: '', party_1_phone: '', party_1_address: '',
                party_2_name: '', party_2_email: '', party_2_phone: '', party_2_address: '',
                party_3_name: '', party_3_email: '', party_3_phone: '', party_3_address: '',
                contract_number: '',
                contract_date: new Date().toLocaleDateString('en-CA'),
                expiry_date: '',
                status: 'draft',
                contract_content: ''
            });

            setParty1PhoneCode('+91');
            setParty2PhoneCode('+91');
            setParty3PhoneCode('+91');

            if (mode === 'create') {
                fetchNextAgreementNumber();
                fetchLockedAgreementPages();
            }
            // default single page will be overwritten if locked pages are fetched
            setPages([{ id: Date.now(), heading: 'Agreement Page 1', content: '', page_order: 1, is_locked: 0 }]);


        } else if (mode === 'edit') {
            const id = searchParams.get('id');
            const selectedBusinessId = localStorage.getItem('selectedBusinessId');
            if (id && (!editingId || editingId.toString() !== id)) {
                // Fetch full contract details (with pages) by ID
                contractAPI.getById(id, selectedBusinessId)
                    .then(response => {
                        if (response.success) {
                            handleEdit(response.data, false);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching contract details:', error);
                        setSearchParams({ mode: 'list' });
                    });
            }
        }
    }, [searchParams, fetchNextAgreementNumber, fetchLockedAgreementPages, editingId, handleEdit, setSearchParams]);


    const handleDelete = (contract) => {
        setItemToDelete(contract);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete || !businessId) return;

        showLoadingModal('Deleting agreement...');
        try {
            const response = await contractAPI.delete(itemToDelete.id, businessId);
            if (response.success) {
                closeModal();
                showSuccessToast('Agreement deleted successfully!');
                fetchContracts();
                setDeleteModalOpen(false);
                setItemToDelete(null);
            }
        } catch (error) {
            closeModal();
            showErrorToast({
                title: 'Error!',
                text: 'Failed to delete agreement.'
            });
        }
    };

    const printRef = useRef(null);
    const dataToUse = (viewMode === 'preview' && previewContract) ? previewContract : formData;

    const executePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Agreement_${dataToUse.contract_number || 'draft'}`,
        onAfterPrint: () => setIsPdfLoading(false),
    });

    const handleDownloadPDF = async () => {
        const hasContent = dataToUse.contract_content || (dataToUse.contract_pages && dataToUse.contract_pages.some(p => p.content));

        if (!hasContent) {
            showErrorToast({
                title: 'Error',
                text: 'Agreement content is empty'
            });
            return;
        }

        setIsPdfLoading(true);
        // Execute the native react-to-print hook
        executePrint();
    };

    const handleDownloadWord = () => {
        const dataToUse = (viewMode === 'preview' && previewContract) ? previewContract : formData;

        const hasContent = dataToUse.contract_content || (dataToUse.contract_pages && dataToUse.contract_pages.some(p => p.content));

        if (!hasContent) {
            showErrorToast('Agreement content is empty');
            return;
        }

        // Helper to format values and avoid 'null' or hyphens
        const fmt = (v) => v && v !== 'null' ? v : '';

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Agreement</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; }
                    .agreement-header { text-align: center; margin-bottom: 25px; border-bottom: 2pt solid #129046; padding-bottom: 12px; }
                    .agreement-title { color: #129046; font-size: 20pt; font-weight: bold; margin: 0; }
                    .metadata { color: #000; margin: 4px 0; font-size: 10pt; }
                    
                    .parties-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 25px; table-layout: fixed; }
                    .party-title { font-weight: bold; color: #000; text-transform: uppercase; font-size: 9pt; border-bottom: 1.5pt solid black; display: inline-block; padding-bottom: 2pt; margin-bottom: 5pt; }
                    .party-detail-cell { vertical-align: top; padding-right: 10pt; font-size: 10pt; }
                    .party-name { font-weight: bold; font-size: 11pt; margin-bottom: 2pt; }
                    .party-info { margin: 0; padding: 0; color: #333; line-height: 1.3; }
                    
                    .content { line-height: 1.4; font-size: 10.5pt; color: #000; margin-top: 20px; margin-bottom: 20px; }
                    .content p { margin: 0 0 8pt 0; padding: 0; }
                    .content h1, .content h2, .content h3, .content h4 { margin-top: 15pt; margin-bottom: 8pt; color: #000; text-transform: uppercase; }
                    
                    .sig-table { width: 100%; border-collapse: collapse; margin-top: 60pt; table-layout: fixed; }
                    .sig-cell { vertical-align: top; text-align: center; padding: 10pt 15pt; }
                    .sig-line-box { border-top: 1.5pt solid black; padding-top: 8pt; width: 100%; }
                    
                    /* Content Table Styling - Universal targeting for Tiptap tables */
                    .content table { border-collapse: collapse; width: 100%; margin: 12pt 0; border: 1.5pt solid black; }
                    .content table th, .content table td { border: 1pt solid black; padding: 4pt 6pt; text-align: left; font-size: 10pt; line-height: 1.2; }
                    .content table th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 9pt; }
                    .content table p { margin: 0 !important; padding: 0 !important; }
                </style>
            </head>
            <body>
                <div class="agreement-header">
                    <h1 class="agreement-title">AGREEMENT</h1>
                    <p class="metadata"><b>Agreement No:</b> ${dataToUse.contract_number}</p>
                    <p class="metadata"><b>Date:</b> ${new Date(dataToUse.contract_date).toLocaleDateString()}</p>
                </div>

                <table class="parties-table" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td class="party-detail-cell" width="${dataToUse.party_3_name ? '33.3%' : '50%'}">
                            <div class="party-title">PARTY 1:</div>
                            <div class="party-name">${fmt(dataToUse.party_1_name)}</div>
                            <div class="party-info">${fmt(dataToUse.party_1_address)}</div>
                            <div class="party-info">Email: ${fmt(dataToUse.party_1_email)}</div>
                            <div class="party-info">Phone: ${fmt(dataToUse.party_1_phone)}</div>
                        </td>
                        <td class="party-detail-cell" width="${dataToUse.party_3_name ? '33.3%' : '50%'}">
                            <div class="party-title">PARTY 2:</div>
                            <div class="party-name">${fmt(dataToUse.party_2_name)}</div>
                            <div class="party-info">${fmt(dataToUse.party_2_address)}</div>
                            <div class="party-info">Email: ${fmt(dataToUse.party_2_email)}</div>
                            <div class="party-info">Phone: ${fmt(dataToUse.party_2_phone)}</div>
                        </td>
                        ${dataToUse.party_3_name ? `
                        <td class="party-detail-cell" width="33.4%">
                            <div class="party-title">PARTY 3:</div>
                            <div class="party-name">${fmt(dataToUse.party_3_name)}</div>
                            <div class="party-info">${fmt(dataToUse.party_3_address)}</div>
                            <div class="party-info">Email: ${fmt(dataToUse.party_3_email)}</div>
                            <div class="party-info">Phone: ${fmt(dataToUse.party_3_phone)}</div>
                        </td>` : ''}
                    </tr>
                </table>

                <div class="content">
                    ${dataToUse.contract_pages && dataToUse.contract_pages.length > 0 ?
                dataToUse.contract_pages.map(page => `
                            <div style="margin-bottom: 20pt; page-break-inside: avoid;">
                                <h4 style="font-size: 13pt; font-weight: bold; border-bottom: 2pt solid black; padding-bottom: 4pt; margin-bottom: 10pt; text-transform: uppercase;">${page.heading}</h4>
                                <div style="font-size: 10.5pt; text-align: justify; line-height: 1.4;">${page.content}</div>
                            </div>
                        `).join('') :
                `<div style="font-size: 10.5pt; text-align: justify; line-height: 1.4;">${dataToUse.contract_content}</div>`
            }
                </div>

                <table class="sig-table" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td class="sig-cell" width="${dataToUse.party_3_name ? '33.3%' : '50%'}">
                            <div class="sig-line-box">
                                <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2pt;">AUTHORIZED SIGNATORY</div>
                                <div style="font-size: 9pt; color: #666;">(Party 1)</div>
                            </div>
                        </td>
                        <td class="sig-cell" width="${dataToUse.party_3_name ? '33.3%' : '50%'}">
                            <div class="sig-line-box">
                                <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2pt;">AUTHORIZED SIGNATORY</div>
                                <div style="font-size: 9pt; color: #666;">(Party 2)</div>
                            </div>
                        </td>
                        ${dataToUse.party_3_name ? `
                        <td class="sig-cell" width="33.4%">
                            <div class="sig-line-box">
                                <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2pt;">AUTHORIZED SIGNATORY</div>
                                <div style="font-size: 9pt; color: #666;">(Party 3)</div>
                            </div>
                        </td>` : ''}
                    </tr>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Agreement_${dataToUse.contract_number || 'draft'}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showErrorToast({
                title: 'Validation Error',
                text: 'Please fix the errors in the form'
            });
            return;
        }

        showLoadingModal(`${editingId ? 'Updating' : 'Creating'} agreement...`);
        try {
            // Combine phone data for submission
            const submissionData = {
                ...formData,
                party_1_phone: formData.party_1_phone.trim() ? `${party1PhoneCode} ${formData.party_1_phone}`.trim() : "",
                party_2_phone: formData.party_2_phone.trim() ? `${party2PhoneCode} ${formData.party_2_phone}`.trim() : "",
                party_3_phone: formData.party_3_phone.trim() ? `${party3PhoneCode} ${formData.party_3_phone}`.trim() : "",
                contract_pages: pages
            };

            let response;
            if (editingId) {
                response = await contractAPI.update(editingId, submissionData, businessId);
            } else {
                response = await contractAPI.create(submissionData, businessId);
            }

            if (response.success) {
                closeModal();
                showSuccessToast(`Agreement ${editingId ? 'updated' : 'created'} successfully!`);
                setSearchParams({ mode: 'list' });
                fetchContracts();
            }
        } catch (error) {
            closeModal();
            showErrorToast({
                title: 'Error!',
                text: 'Failed to save agreement.'
            });
        }
    };

    const filteredContracts = useMemo(() => {
        let result = [...contracts];

        // Date Filter
        const bounds = getRangeBoundsPure(dateRangeLabel, customRange);
        if (bounds) {
            const { start, end } = bounds;
            const todayStr = new Date().toLocaleDateString('en-CA');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-CA');

            result = result.filter(c => {
                const raw = c.contract_date;
                if (!raw) return false;
                // Parse the row date. If it's a full ISO string, split at 'T' to get YYYY-MM-DD
                const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw;

                // For Today and Yesterday, use strict string comparison for reliability
                if (dateRangeLabel === 'Today') return dateOnly === todayStr;
                if (dateRangeLabel === 'Yesterday') return dateOnly === yesterdayStr;

                // For other ranges, use Date bounds comparison
                const d = new Date(dateOnly + 'T00:00:00');
                return !isNaN(d.getTime()) && d >= start && d <= end;
            });
        }

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(c =>
                c.contract_number?.toLowerCase().includes(q) ||
                c.party_1_name?.toLowerCase().includes(q) ||
                c.party_2_name?.toLowerCase().includes(q) ||
                c.party_3_name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [contracts, dateRangeLabel, customRange, searchQuery]);

    const columns = [
        {
            key: 'contract_number',
            title: 'Agreement Details',
            sortable: true,
            render: (r) => (
                <div className="flex flex-col">
                    <span className="text-sm text-gray-800">{r.contract_number}</span>
                </div>
            )
        },
        {
            key: 'party_1_name',
            title: 'Party 1',
            sortable: true,
            render: (r) => <span className="text-sm text-gray-600 font-medium">{r.party_1_name || '-'}</span>
        },
        {
            key: 'party_2_name',
            title: 'Party 2',
            sortable: true,
            render: (r) => <span className="text-sm text-gray-600 font-medium">{r.party_2_name || '-'}</span>
        },
        {
            key: 'party_3_name',
            title: 'Party 3',
            sortable: true,
            render: (r) => <span className="text-sm text-gray-600 font-medium">{r.party_3_name || '-'}</span>
        },
        {
            key: 'contract_date',
            title: 'Created Date',
            sortable: true,
            render: (r) => <span className="text-sm text-gray-500">{new Date(r.contract_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        },
        {
            key: 'status',
            title: 'Status',
            sortable: true,
            render: (r) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'active' ? 'text-green-600 bg-green-50 border border-green-200' :
                    r.status === 'draft' ? 'text-blue-600 bg-blue-50 border border-blue-200' :
                        r.status === 'expired' ? 'text-red-600 bg-red-50 border border-red-200' :
                            'text-gray-600 bg-gray-50 border border-gray-200'}`}>
                    {r.status?.charAt(0).toUpperCase() + r.status?.slice(1)}
                </span>
            )
        },
        {
            key: 'actions',
            title: 'Actions',
            tdClass: 'text-right',
            render: (r) => (
                <ActionButtons
                    onEdit={(e) => { e.stopPropagation(); handleEdit(r); }}
                    onDelete={(e) => { e.stopPropagation(); handleDelete(r); }}
                    actions={['edit', 'delete']}
                />
            )
        }
    ];



    return (
        <>
            {viewMode === 'list' && (
                <div className="custombackground min-h-screen w-full border-1 border-gray-200 rounded-xl mt-4 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-white">
                        {/* Mobile Header */}
                        <div className="flex md:hidden items-center justify-between gap-3 mb-3">
                            <DashboardBackButton mobileFullWidth={false} showText={true} className="!text-[10px] !px-2" />
                            <button
                                onClick={() => setSearchParams({ mode: 'create' })}
                                className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-xs font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <Plus size={18} />
                                New
                            </button>
                        </div>

                        {/* Desktop Header & Integrated Search/Filters */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="hidden md:block">
                                <DashboardBackButton />
                            </div>

                            <div className="flex flex-1 md:max-w-sm relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#129046] transition-colors" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search agreements..."
                                    className="w-full h-8 pl-10 pr-4 bg-white border-1 border-gray-200 rounded-lg text-sm focus:border-[#129046] focus:ring-1 focus:ring-[#129046]/10 outline-none transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Date_wise_Filter_Button
                                    dateRangeLabel={dateRangeLabel}
                                    onRangeChange={(val) => setDateRangeLabel(val)}
                                    customRange={customRange}
                                    onRangeApply={(range) => {
                                        setCustomRange(range);
                                        setDateRangeLabel("Custom Date Range");
                                    }}
                                />

                                <div className="hidden md:block">
                                    <button
                                        onClick={() => setSearchParams({ mode: 'create' })}
                                        className="bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] text-sm font-medium transition-all duration-200 focus:outline-none h-8 px-3 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                    >
                                        <Plus size={18} />
                                        New
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!loading && (
                        <div className="flex-1 overflow-hidden">
                            <ReusableTable
                                columns={columns}
                                data={filteredContracts}
                                rowKey="id"
                                onRowClick={async (row) => {
                                    showLoadingModal('Fetching agreement details...');
                                    try {
                                        const res = await contractAPI.getById(row.id, businessId);
                                        if (res.success) {
                                            setPreviewContract(res.data);
                                            setViewMode('preview');
                                            closeModal();
                                        }
                                    } catch (error) {
                                        console.error('Error fetching agreement details:', error);
                                        showErrorToast("Could not load agreement details");
                                        closeModal();
                                    }
                                }}
                                emptyState={<GeneralEmptyState title="No agreements found" description="Create and manage your legal agreements here." icon={FileText} />}
                            />
                        </div>
                    )}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white">
                            <div className="w-8 h-8 border-4 border-[#129046]/30 border-t-[#129046] rounded-full animate-spin mb-4" />
                            <p className="text-gray-500 font-medium">Loading agreements...</p>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'preview' && previewContract && (
                <>
                    <div className="min-h-screen bg-gray-50 w-full">
                        {/* Fixed Header-Always visible at top */}
                        <div className="fixed top-16 left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm">
                            <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
                                {/* Left side: Back button and title */}
                                <div className="flex items-center gap-3">
                                    {/* Desktop Back Button */}
                                    <button
                                        onClick={() => { setViewMode('list'); setSearchParams({ mode: 'list' }); setPreviewContract(null); }}
                                        className="hidden sm:flex group p-1.5 border-1 border-gray-900 rounded-lg hover:bg-gray-100 hover:border-green-700 flex-shrink-0"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-zinc-900 group-hover:text-green-700" />
                                    </button>

                                    {/* Mobile Back Button */}
                                    <button
                                        onClick={() => { setViewMode('list'); setSearchParams({ mode: 'list' }); setPreviewContract(null); }}
                                        className="sm:hidden group p-1.5 border border-gray-900 rounded-lg hover:bg-gray-100 hover:border-green-700 flex-shrink-0"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-zinc-900 group-hover:text-green-700" />
                                    </button>

                                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
                                        Agreement Preview-{previewContract?.contract_number}
                                    </h1>
                                </div>

                                {/* Right side: Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={isPdfLoading}
                                        className="h-8 px-2 sm:px-3 bg-gradient-to-r from-[#129046] to-[#9ccc53] hover:from-[#129046]/90 hover:to-[#9ccc53]/90 text-white rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                                    >
                                        {isPdfLoading ? (
                                            <span className="hidden sm:inline">Generating...</span>
                                        ) : (
                                            <>
                                                <Download size={14} className="sm:w-4 sm:h-4" />
                                                <span className="hidden sm:inline">Download PDF</span>
                                                <span className="sm:hidden">PDF</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleDownloadWord}
                                        className="h-8 px-2 sm:px-3 bg-white border-1 border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-[7px] text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                                    >
                                        <Download size={14} className="sm:w-4 sm:h-4 text-blue-500" />
                                        <span className="hidden sm:inline">Download Word</span>
                                        <span className="sm:hidden">Word</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PDF Preview Content-Full Width Centered with top padding for fixed header */}
                        <div className="preview-wrapper pt-36 p-6 bg-white w-full min-h-screen">
                            <div className="w-full max-w-7xl mx-auto">
                                <div className="w-full" style={{ maxWidth: '250mm', margin: '0 auto', overflowX: 'auto' }}>
                                    {previewContract.contract_pages && previewContract.contract_pages.length > 0 ? (
                                        previewContract.contract_pages.map((page, index) => {
                                            const isFirstPage = index === 0;
                                            const isLastPage = index === previewContract.contract_pages.length - 1;

                                            return (
                                                <div key={page.id} className="pdf-page bg-white p-12 shadow-sm border border-gray-100 rounded-xl mb-8 relative flex flex-col" style={{ minHeight: '297mm', minWidth: '210mm' }}>
                                                    {/* Only show Header and Parties on the First Page */}
                                                    {isFirstPage && (
                                                        <>
                                                            <div style={{ paddingBottom: '15px' }}>
                                                                <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase', color: '#129046' }}>AGREEMENT</h1>
                                                                <p style={{ color: '#666', margin: '4px 0', fontSize: '12px' }}>Agreement No: {previewContract.contract_number}</p>
                                                                <p style={{ color: '#666', margin: '4px 0', fontSize: '12px' }}>Date: {new Date(previewContract.contract_date).toLocaleDateString()}</p>
                                                            </div>
                                                            <div style={{ width: '100%', borderBottom: '2px solid #129046', marginBottom: '20px' }}></div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: previewContract.party_3_name ? '1fr 1fr 1fr' : '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                                                <div>
                                                                    <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '3px' }}>PARTY 1 :</p>
                                                                    <p className="font-bold text-sm text-black" style={{ fontSize: '13px' }}>{previewContract.party_1_name}</p>
                                                                    <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '11px' }}>{previewContract.party_1_address}</p>
                                                                    <div className="flex flex-col mt-1">
                                                                        <span className="text-[10px] text-gray-500">Email: {previewContract.party_1_email}</span>
                                                                        <span className="text-[10px] text-gray-500">Phone: {previewContract.party_1_phone}</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '3px' }}>PARTY 2 :</p>
                                                                    <p className="font-bold text-sm text-black" style={{ fontSize: '13px' }}>{previewContract.party_2_name}</p>
                                                                    <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '11px' }}>{previewContract.party_2_address}</p>
                                                                    <div className="flex flex-col mt-1">
                                                                        <span className="text-[10px] text-gray-500">Email: {previewContract.party_2_email}</span>
                                                                        <span className="text-[10px] text-gray-500">Phone: {previewContract.party_2_phone}</span>
                                                                    </div>
                                                                </div>
                                                                {previewContract.party_3_name && (
                                                                    <div>
                                                                        <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '3px' }}>PARTY 3 :</p>
                                                                        <p className="font-bold text-sm text-black" style={{ fontSize: '13px' }}>{previewContract.party_3_name}</p>
                                                                        <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '11px' }}>{previewContract.party_3_address}</p>
                                                                        <div className="flex flex-col mt-1">
                                                                            <span className="text-[10px] text-gray-500">Email: {previewContract.party_3_email}</span>
                                                                            <span className="text-[10px] text-gray-500">Phone: {previewContract.party_3_phone}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Contract Content For This Page */}
                                                    <div className="contract-content-preview flex-1" style={{ lineHeight: '1.4', fontSize: '13px', color: '#000', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                        <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
                                                            <h4 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '2px solid #9ccc53', paddingBottom: '5px', marginBottom: '10px', color: '#129046', textTransform: 'uppercase' }}>
                                                                {page.heading}
                                                            </h4>
                                                            <div
                                                                className="tiptap-page-preview w-full"
                                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}

                                                                style={{ fontSize: '13px', textAlign: 'justify', lineHeight: '1.4', color: '#000' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Only show Signatures on the Last Page */}
                                                    {isLastPage && (
                                                        <div style={{ marginTop: 'auto', paddingTop: '60px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: previewContract.party_3_name ? '1fr 1fr 1fr' : '1fr 1fr', gap: previewContract.party_3_name ? '30px' : '80px' }}>
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <div style={{ width: '180px', margin: '0 auto' }}>
                                                                        <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                                                        <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '2px' }}>AUTHORIZED SIGNATORY</strong>
                                                                        <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(Party 1)</p>
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <div style={{ width: '180px', margin: '0 auto' }}>
                                                                        <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                                                        <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '2px' }}>AUTHORIZED SIGNATORY</strong>
                                                                        <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(Party 2)</p>
                                                                    </div>
                                                                </div>
                                                                {previewContract.party_3_name && (
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <div style={{ width: '180px', margin: '0 auto' }}>
                                                                            <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                                                            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '2px' }}>AUTHORIZED SIGNATORY</strong>
                                                                            <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(Party 3)</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        /* Fallback if no pages (Legacy/Empty) */
                                        <div className="pdf-page bg-white p-12 shadow-sm border border-gray-100 rounded-xl relative flex flex-col mb-8" style={{ minHeight: '297mm', minWidth: '210mm' }}>
                                            <div style={{ paddingBottom: '15px' }}>
                                                <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase', color: '#129046' }}>AGREEMENT</h1>
                                                <p style={{ color: '#666', margin: '4px 0', fontSize: '12px' }}>Agreement No: {previewContract.contract_number}</p>
                                                <p style={{ color: '#666', margin: '4px 0', fontSize: '12px' }}>Date: {new Date(previewContract.contract_date).toLocaleDateString()}</p>
                                            </div>
                                            <div style={{ width: '100%', borderBottom: '2px solid #129046', marginBottom: '20px' }}></div>

                                            <div style={{ display: 'grid', gridTemplateColumns: previewContract.party_3_name ? '1fr 1fr 1fr' : '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                                <div>
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '3px' }}>PARTY 1 :</p>
                                                    <p className="font-bold text-sm text-black" style={{ fontSize: '13px' }}>{previewContract.party_1_name}</p>
                                                    <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '11px' }}>{previewContract.party_1_address}</p>
                                                    <div className="flex flex-col mt-1">
                                                        <span className="text-[10px] text-gray-500">Email: {previewContract.party_1_email}</span>
                                                        <span className="text-[10px] text-gray-500">Phone: {previewContract.party_1_phone}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '3px' }}>PARTY 2 :</p>
                                                    <p className="font-bold text-sm text-black" style={{ fontSize: '13px' }}>{previewContract.party_2_name}</p>
                                                    <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '11px' }}>{previewContract.party_2_address}</p>
                                                    <div className="flex flex-col mt-1">
                                                        <span className="text-[10px] text-gray-500">Email: {previewContract.party_2_email}</span>
                                                        <span className="text-[10px] text-gray-500">Phone: {previewContract.party_2_phone}</span>
                                                    </div>
                                                </div>
                                                {previewContract.party_3_name && (
                                                    <div>
                                                        <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 'bold', color: '#129046', display: 'inline-block', paddingBottom: '3px' }}>PARTY 3 :</p>
                                                        <p className="font-bold text-sm text-black" style={{ fontSize: '13px' }}>{previewContract.party_3_name}</p>
                                                        <p className="text-xs text-gray-600 leading-tight" style={{ fontSize: '11px' }}>{previewContract.party_3_address}</p>
                                                        <div className="flex flex-col mt-1">
                                                            <span className="text-[10px] text-gray-500">Email: {previewContract.party_3_email}</span>
                                                            <span className="text-[10px] text-gray-500">Phone: {previewContract.party_3_phone}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="contract-content-preview flex-1" style={{ lineHeight: '1.4', fontSize: '13px', color: '#000', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                <div
                                                    className="tiptap-page-preview w-full"
                                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContract.contract_content) }}

                                                    style={{ fontSize: '13px', textAlign: 'justify', lineHeight: '1.4', color: '#000' }}
                                                />
                                            </div>

                                            <div style={{ marginTop: 'auto', paddingTop: '60px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: previewContract.party_3_name ? '1fr 1fr 1fr' : '1fr 1fr', gap: previewContract.party_3_name ? '30px' : '80px' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ width: '180px', margin: '0 auto' }}>
                                                            <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                                            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '2px' }}>AUTHORIZED SIGNATORY</strong>
                                                            <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(Party 1)</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ width: '180px', margin: '0 auto' }}>
                                                            <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                                            <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '2px' }}>AUTHORIZED SIGNATORY</strong>
                                                            <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(Party 2)</p>
                                                        </div>
                                                    </div>
                                                    {previewContract.party_3_name && (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ width: '180px', margin: '0 auto' }}>
                                                                <div style={{ borderTop: '2px solid #000', marginBottom: '10px' }}></div>
                                                                <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#000', display: 'block', marginBottom: '2px' }}>AUTHORIZED SIGNATORY</strong>
                                                                <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>(Party 3)</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>{`
                    .preview-wrapper .contract-content-preview {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                    }
           
                    .preview-wrapper .tiptap-page-preview p { margin-bottom: 1.25rem; }
                    .preview-wrapper .tiptap-page-preview td p, .preview-wrapper .tiptap-page-preview th p { margin: 0 !important; }
                    .preview-wrapper .tiptap-page-preview ul, .preview-wrapper .tiptap-page-preview ol { padding-left: 2.5rem; margin-bottom: 1.5rem; }
                    .preview-wrapper .tiptap-page-preview li { margin-bottom: 0.5rem; }
                    .preview-wrapper .tiptap-page-preview h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 2rem; color: #000; letter-spacing: -0.02em; }
                    .preview-wrapper .tiptap-page-preview h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem; color: #111; letter-spacing: -0.01em; }
                    .preview-wrapper .tiptap-page-preview h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #222; }
                    .preview-wrapper .tiptap-page-preview h4 { 
                        margin-top: 25px; 
                        margin-bottom: 15px; 
                        text-transform: uppercase;
                        border-bottom: 2.2px solid #9ccc53;
                        padding-bottom: 5px;
                        font-size: 16px;
                        font-weight: 700;
                        display: block;
                        width: 100%;
                        color: #129046;
                    }
                    .preview-wrapper .tiptap-page-preview table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin: 2rem 0 !important;
                        table-layout: auto !important;
                        border: 1.5px solid #000 !important;
                    }
                    .preview-wrapper .tiptap-page-preview th, .preview-wrapper .tiptap-page-preview td {
                        border: 1px solid #000 !important;
                        padding: 4px 6px !important;
                        vertical-align: top !important;
                        text-align: left !important;
                        min-width: 50px;
                        color: #000 !important;
                    }
                    .preview-wrapper .tiptap-page-preview th {
                        background-color: #f9f9f9 !important;
                        font-weight: 700 !important;
                        text-transform: uppercase;
                        font-size: 11px;
                    }
                `}</style>
                    <div style={{ display: 'none' }}>
                        <div ref={printRef}>
                            <AgreementPDFTemplate data={(viewMode === 'preview' && previewContract) ? previewContract : formData} />
                        </div>
                    </div>
                </>
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
                <div className="mt-4 min-h-screen w-full">
                    {/* Header Card consistent with Quotation */}
                    <div className="bg-white border-1 border-gray-200 text-zinc-900 rounded-xl mb-4 p-3 md:p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                    onClick={() => setSearchParams({ mode: 'list' })}
                                    className="p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-yellow-900" />
                                </button>
                                <h3 className="text-lg md:text-xl font-bold truncate text-yellow-900">
                                    {editingId ? "Update Agreement" : "Create Agreement"}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setSearchParams({ mode: 'list' })}
                                    style={{ padding: "6px 12px" }}
                                    className="bg-red-600 text-white rounded-[7px] text-sm md:text-base font-medium hover:bg-red-700 transition-colors md:h-8 md:py-1 flex items-center justify-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    style={{ padding: "6px 12px" }}
                                    className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] text-sm md:text-base font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 md:h-8 md:py-1 flex items-center justify-center shadow-sm"
                                >
                                    {editingId ? "Update Changes" : "Save Agreement"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Form Card */}
                    <div className="w-full h-full bg-white rounded-xl border-1 border-gray-200 p-4 md:p-6">
                        <div className="space-y-8 overflow-y-auto">
                            {/* Party 1, Party 2 & Party 3 Details Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Party 1 Column */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-zinc-900 border-b border-gray-200 pb-2">
                                        Party 1 Details
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Entity Name (Party 1) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.party_1_name}
                                            onChange={(e) => handleInputChange('party_1_name', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_1_name
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="Enter Party 1 Name"
                                            required
                                        />
                                        {errors.party_1_name && (
                                            <p className="text-xs text-red-500 mt-1">{errors.party_1_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.party_1_email}
                                            onChange={(e) => handleInputChange('party_1_email', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_1_email
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="Enter Email Address"
                                        />
                                        {errors.party_1_email && (
                                            <p className="text-xs text-red-500 mt-1">{errors.party_1_email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <div className="flex items-start gap-2">
                                            <div className="relative w-24 custom-dropdown" data-dropdown="party1PhoneCode">
                                                <input
                                                    ref={party1PhoneCodeInputRef}
                                                    type="text"
                                                    autoComplete="off"
                                                    value={phoneCodeDropdowns.party1 ? phoneCodeSearchTerms.party1 : party1PhoneCode}
                                                    onChange={(e) => {
                                                        setPhoneCodeSearchTerms(prev => ({ ...prev, party1: e.target.value }));
                                                        if (!phoneCodeDropdowns.party1) {
                                                            setPhoneCodeDropdowns(prev => ({ ...prev, party1: true }));
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        setPhoneCodeDropdowns(prev => ({ ...prev, party1: true }));
                                                        setPhoneCodeHighlightedIndices(prev => ({ ...prev, party1: 0 }));
                                                    }}
                                                    onKeyDown={(e) => handlePhoneCodeKeyDown(e, 'party1')}
                                                    className="w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                                                    placeholder="+91"
                                                />
                                                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${phoneCodeDropdowns.party1 ? 'rotate-180' : ''}`} />

                                                {phoneCodeDropdowns.party1 && (
                                                    <div
                                                        ref={party1PhoneCodeOptionsListRef}
                                                        className="absolute top-full left-0 w-64 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-64 overflow-y-auto py-1"
                                                    >
                                                        {getFilteredCountryCodes('party1').length > 0 ? (
                                                            getFilteredCountryCodes('party1').map((country, index) => (
                                                                <div
                                                                    key={country.code}
                                                                    id={`party1-code-option-${index}`}
                                                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${index === phoneCodeHighlightedIndices.party1 ? 'bg-green-50 text-[#129046]' : 'text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        selectPhoneCodeOption(country.dial_code, 'party1');
                                                                    }}
                                                                    onMouseEnter={() => setPhoneCodeHighlightedIndices(prev => ({ ...prev, party1: index }))}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span className="truncate">{country.name}</span>
                                                                    </div>
                                                                    <span className="font-medium text-gray-400">{country.dial_code}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-2 text-sm text-gray-500 italic text-center">No results found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={formData.party_1_phone}
                                                    onChange={(e) => handleInputChange('party_1_phone', e.target.value)}
                                                    className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_1_phone
                                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                        : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                        }`}
                                                    placeholder="Enter Phone Number"
                                                    maxLength="40"
                                                />
                                                {errors.party_1_phone && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.party_1_phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.party_1_address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, party_1_address: e.target.value }))}
                                            rows={2}
                                            className="w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm resize-none focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                                            placeholder="Enter complete address"
                                        />
                                    </div>
                                </div>

                                {/* Party 2 Column */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-zinc-900 border-b border-gray-200 pb-2">
                                        Party 2 Details
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Entity Name (Party 2) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.party_2_name}
                                            onChange={(e) => handleInputChange('party_2_name', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_2_name
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="Enter Party 2 Name"
                                            required
                                        />
                                        {errors.party_2_name && (
                                            <p className="text-xs text-red-500 mt-1">{errors.party_2_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.party_2_email}
                                            onChange={(e) => handleInputChange('party_2_email', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_2_email
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="Enter Email Address"
                                        />
                                        {errors.party_2_email && (
                                            <p className="text-xs text-red-500 mt-1">{errors.party_2_email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <div className="flex items-start gap-2">
                                            <div className="relative w-24 custom-dropdown" data-dropdown="party2PhoneCode">
                                                <input
                                                    ref={party2PhoneCodeInputRef}
                                                    type="text"
                                                    autoComplete="off"
                                                    value={phoneCodeDropdowns.party2 ? phoneCodeSearchTerms.party2 : party2PhoneCode}
                                                    onChange={(e) => {
                                                        setPhoneCodeSearchTerms(prev => ({ ...prev, party2: e.target.value }));
                                                        if (!phoneCodeDropdowns.party2) {
                                                            setPhoneCodeDropdowns(prev => ({ ...prev, party2: true }));
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        setPhoneCodeDropdowns(prev => ({ ...prev, party2: true }));
                                                        setPhoneCodeHighlightedIndices(prev => ({ ...prev, party2: 0 }));
                                                    }}
                                                    onKeyDown={(e) => handlePhoneCodeKeyDown(e, 'party2')}
                                                    className="w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                                                    placeholder="+91"
                                                />
                                                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${phoneCodeDropdowns.party2 ? 'rotate-180' : ''}`} />

                                                {phoneCodeDropdowns.party2 && (
                                                    <div
                                                        ref={party2PhoneCodeOptionsListRef}
                                                        className="absolute top-full left-0 w-64 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-64 overflow-y-auto py-1"
                                                    >
                                                        {getFilteredCountryCodes('party2').length > 0 ? (
                                                            getFilteredCountryCodes('party2').map((country, index) => (
                                                                <div
                                                                    key={country.code}
                                                                    id={`party2-code-option-${index}`}
                                                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${index === phoneCodeHighlightedIndices.party2 ? 'bg-green-50 text-[#129046]' : 'text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        selectPhoneCodeOption(country.dial_code, 'party2');
                                                                    }}
                                                                    onMouseEnter={() => setPhoneCodeHighlightedIndices(prev => ({ ...prev, party2: index }))}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span className="truncate">{country.name}</span>
                                                                    </div>
                                                                    <span className="font-medium text-gray-400">{country.dial_code}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-2 text-sm text-gray-500 italic text-center">No results found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={formData.party_2_phone}
                                                    onChange={(e) => handleInputChange('party_2_phone', e.target.value)}
                                                    className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_2_phone
                                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                        : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                        }`}
                                                    placeholder="Enter Phone Number"
                                                    maxLength="40"
                                                />
                                                {errors.party_2_phone && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.party_2_phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.party_2_address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, party_2_address: e.target.value }))}
                                            rows={2}
                                            className="w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm resize-none focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                                            placeholder="Enter complete address"
                                        />
                                    </div>
                                </div>

                                {/* Party 3 Column */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-zinc-900 border-b border-gray-200 pb-2">
                                        Party 3 Details (Optional)
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Entity Name (Party 3)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.party_3_name}
                                            onChange={(e) => handleInputChange('party_3_name', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_3_name
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="Enter Party 3 Name"
                                        />
                                        {errors.party_3_name && (
                                            <p className="text-xs text-red-500 mt-1">{errors.party_3_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.party_3_email}
                                            onChange={(e) => handleInputChange('party_3_email', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_3_email
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="Enter Email Address"
                                        />
                                        {errors.party_3_email && (
                                            <p className="text-xs text-red-500 mt-1">{errors.party_3_email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <div className="flex items-start gap-2">
                                            <div className="relative w-24 custom-dropdown" data-dropdown="party3PhoneCode">
                                                <input
                                                    ref={party3PhoneCodeInputRef}
                                                    type="text"
                                                    autoComplete="off"
                                                    value={phoneCodeDropdowns.party3 ? phoneCodeSearchTerms.party3 : party3PhoneCode}
                                                    onChange={(e) => {
                                                        setPhoneCodeSearchTerms(prev => ({ ...prev, party3: e.target.value }));
                                                        if (!phoneCodeDropdowns.party3) {
                                                            setPhoneCodeDropdowns(prev => ({ ...prev, party3: true }));
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        setPhoneCodeDropdowns(prev => ({ ...prev, party3: true }));
                                                        setPhoneCodeHighlightedIndices(prev => ({ ...prev, party3: 0 }));
                                                    }}
                                                    onKeyDown={(e) => handlePhoneCodeKeyDown(e, 'party3')}
                                                    className="w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                                                    placeholder="+91"
                                                />
                                                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${phoneCodeDropdowns.party3 ? 'rotate-180' : ''}`} />

                                                {phoneCodeDropdowns.party3 && (
                                                    <div
                                                        ref={party3PhoneCodeOptionsListRef}
                                                        className="absolute top-full left-0 w-64 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-64 overflow-y-auto py-1"
                                                    >
                                                        {getFilteredCountryCodes('party3').length > 0 ? (
                                                            getFilteredCountryCodes('party3').map((country, index) => (
                                                                <div
                                                                    key={country.code}
                                                                    id={`party3-code-option-${index}`}
                                                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${index === phoneCodeHighlightedIndices.party3 ? 'bg-green-50 text-[#129046]' : 'text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        selectPhoneCodeOption(country.dial_code, 'party3');
                                                                    }}
                                                                    onMouseEnter={() => setPhoneCodeHighlightedIndices(prev => ({ ...prev, party3: index }))}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span className="truncate">{country.name}</span>
                                                                    </div>
                                                                    <span className="font-medium text-gray-400">{country.dial_code}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-2 text-sm text-gray-500 italic text-center">No results found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={formData.party_3_phone}
                                                    onChange={(e) => handleInputChange('party_3_phone', e.target.value)}
                                                    className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.party_3_phone
                                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                        : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                        }`}
                                                    placeholder="Enter Phone Number"
                                                    maxLength="40"
                                                />
                                                {errors.party_3_phone && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.party_3_phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.party_3_address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, party_3_address: e.target.value }))}
                                            rows={2}
                                            className="w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm resize-none focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors"
                                            placeholder="Enter complete address"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Agreement Details Section */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-zinc-900 border-b border-gray-200 pb-2">
                                    Agreement Metadata
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Agreement Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contract_number}
                                            onChange={(e) => handleInputChange('contract_number', e.target.value)}
                                            className={`w-full px-3 py-2 border-1 rounded-xl text-sm focus:ring-1 focus:ring-offset-1 focus:outline-none transition-colors ${errors.contract_number
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-400'
                                                : 'border-gray-200 focus:border-[#129046] focus:ring-green-400'
                                                }`}
                                            placeholder="e.g. AGT-2026-27-0001"
                                            required
                                        />
                                        {errors.contract_number && (
                                            <p className="text-xs text-red-500 mt-1">{errors.contract_number}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Current Status
                                        </label>
                                        <CommonDropdown
                                            options={[
                                                { id: 'draft', label: 'Draft' },
                                                { id: 'active', label: 'Active' },
                                                { id: 'inactive', label: 'Inactive' },
                                                { id: 'expired', label: 'Expired' }
                                            ]}
                                            value={formData.status}
                                            onChange={(opt) => setFormData(prev => ({ ...prev, status: opt.id }))}
                                            valueBy="id"
                                            placeholder="Select Status"
                                            className="w-full h-10"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.contract_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, contract_date: e.target.value }))}
                                            className={`w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors`}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.expiry_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                                            className={`w-full px-3 py-2 border-1 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:ring-offset-1 focus:outline-none transition-colors`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Agreement Content Section */}
                            <div className="space-y-4">
                                {/* Agreement Pages Content Section */}
                                <section className="mt-8 mb-10 px-1">
                                    <div className="border-2 border-yellow-200 rounded-2xl p-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
                                        <div className="flex items-center justify-between mb-6 border-b border-yellow-100 pb-4">
                                            <h4 className="text-lg font-semibold text-zinc-900 border-b border-gray-200 pb-2">
                                                AGREEMENT PAGES
                                            </h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Manage agreement content page-by-page</p>
                                        </div>

                                        <div className="space-y-5">
                                            {pages.map((page, index) => (
                                                <div key={page.id} className="group transition-all hover:bg-gray-50/50 p-4 md:p-5 rounded-xl border border-gray-100 mb-4 bg-white shadow-sm hover:shadow-md">
                                                    {/* Page Header: Title on Left */}
                                                    <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                                                        <h3 className="text-sm font-bold text-[#129046] uppercase tracking-wider">
                                                            {page.heading}
                                                        </h3>
                                                    </div>

                                                    {/* Full Width Content Preview */}
                                                    <div className="w-full preview-wrapper">
                                                        {page.content && (
                                                            <div
                                                                className="tiptap-page-preview w-full"
                                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}

                                                            />
                                                        )}
                                                    </div>

                                                    {/* Page Footer: Buttons on Right */}
                                                    <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-50">
                                                        {/* 1. Lock Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTogglePageLock(page.id)}
                                                            className={`${page.is_locked
                                                                ? "bg-red-500 border-red-600 shadow-sm"
                                                                : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600 shadow-sm"
                                                                } w-9 h-9 rounded-lg flex items-center justify-center transition-all border`}
                                                            title={page.is_locked ? "Locked" : "Unlock"}
                                                        >
                                                            {page.is_locked ? <Lock size={16} strokeWidth={2.5} stroke="#ffffff" fill="none" /> : <Unlock size={16} strokeWidth={2.5} />}
                                                        </button>

                                                        {/* 2. Edit Button - Disabled if locked */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!page.is_locked) {
                                                                    setEditingPageId(page.id);
                                                                    setShowTextEditor(true);
                                                                }
                                                            }}
                                                            disabled={page.is_locked}
                                                            className={`${page.is_locked
                                                                ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-50"
                                                                : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:scale-105"
                                                                } w-9 h-9 rounded-lg flex items-center justify-center active:scale-95 transition-all border shadow-sm`}
                                                            title={page.is_locked ? "Locked pages cannot be edited" : "Edit Page"}
                                                        >
                                                            <Edit2 size={16} strokeWidth={2.5} />
                                                        </button>

                                                        {/* 3. Delete Button - Hidden if locked */}
                                                        {pages.length > 1 && !page.is_locked && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removePage(page.id)}
                                                                className="bg-red-50 text-red-500 border-red-100 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-100 hover:scale-105 active:scale-95 transition-all border shadow-sm"
                                                                title="Delete Page"
                                                            >
                                                                <Trash2 size={16} strokeWidth={2.5} />
                                                            </button>
                                                        )}

                                                        {/* 4. Add Button - Only on last row */}
                                                        {index === pages.length - 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={addNewPage}
                                                                className="bg-yellow-50 text-yellow-600 border-yellow-200 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-yellow-100 hover:scale-105 active:scale-95 transition-all border shadow-sm"
                                                                title="Add New Page"
                                                            >
                                                                <Plus size={16} strokeWidth={3} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <div className="flex items-center justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
                                    <button
                                        onClick={() => setSearchParams({ mode: 'list' })}
                                        style={{ padding: "6px 20px" }}
                                        className="bg-red-600 text-white rounded-[7px] text-sm md:text-base font-medium hover:bg-red-700 transition-colors h-10 flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        style={{ padding: "6px 20px" }}
                                        className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] text-sm md:text-base font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90 transition-all duration-200 h-10 flex items-center justify-center shadow-sm"
                                    >
                                        {editingId ? "Update Changes" : "Save Agreement"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.contract_number || ""}
                itemType="agreement"
            />

            <TextEditorModal
                open={showTextEditor}
                onClose={() => setShowTextEditor(false)}
                initialContent={pages.find(p => p.id === editingPageId)?.content || ""}
                initialHeading={pages.find(p => p.id === editingPageId)?.heading || ""}
                onSave={(html, heading) => {
                    setPages(pages.map(p => p.id === editingPageId ? { ...p, content: html, heading } : p));
                }}
            />
            <style dangerouslySetInnerHTML={{
                __html: `
                .preview-wrapper .tiptap-page-preview {
                    color: #1a202c;
                    line-height: 1.6;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 14px;
                }
                .preview-wrapper .tiptap-page-preview h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 2rem; color: #000; letter-spacing: -0.02em; }
                .preview-wrapper .tiptap-page-preview h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem; color: #111; letter-spacing: -0.01em; }
                .preview-wrapper .tiptap-page-preview h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #222; }
                .preview-wrapper .tiptap-page-preview p { margin-bottom: 1.25rem; }
                
                .preview-wrapper .tiptap-page-preview ul, 
                .preview-wrapper .tiptap-page-preview ol {
                    padding-left: 2.5rem;
                    margin-bottom: 1.5rem;
                }
                .preview-wrapper .tiptap-page-preview ul { list-style-type: disc; }
                .preview-wrapper .tiptap-page-preview ol { list-style-type: decimal; }
                .preview-wrapper .tiptap-page-preview li { margin-bottom: 0.5rem; }

                /* TABLE STYLES - STRICT BLACK BORDERS & PROFESSIONAL PADDING */
                .preview-wrapper .tiptap-page-preview table {
                    border-collapse: collapse;
                    table-layout: auto;
                    width: 100% !important;
                    margin: 2rem 0;
                    border: 1.5px solid #000 !important;
                    background-color: #fff;
                }
                .preview-wrapper .tiptap-page-preview td,
                .preview-wrapper .tiptap-page-preview th {
                    min-width: 1.5em;
                    border: 1px solid #000 !important;
                    padding: 10px 12px !important;
                    vertical-align: top;
                    box-sizing: border-box;
                    color: #000 !important;
                    word-break: break-word;
                }
                .preview-wrapper .tiptap-page-preview td p, 
                .preview-wrapper .tiptap-page-preview th p { 
                    margin: 0 !important; 
                }
                .preview-wrapper .tiptap-page-preview th {
                    font-weight: bold;
                    text-align: left;
                    background-color: #f8f9fa !important;
                    border-bottom: 2px solid #000 !important;
                    font-size: 13px;
                }
                .preview-wrapper .tiptap-page-preview .agreement-table {
                    border: 1.5px solid #000 !important;
                }
            `}} />
        </>
    );
};

export default Agreement;
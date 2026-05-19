import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    Plus, ArrowLeft, Edit2, Trash2, FileText, X, ChevronDown,
    Upload, MessageSquare, CheckCircle, XCircle, Clock, TrendingUp, Search
} from 'lucide-react';

import ReusableTable from '../../../Components/ReusableTable.jsx';
import Date_wise_Filter_Button, { getRangeBoundsPure } from '../../../Components/Date_wise_Filter_Button.jsx';
import CommonDropdown from '../../../Components/CustomDropdown.jsx';
import SearchableDropdown from '../../../Components/SearchableDropdown.jsx';
import GeneralEmptyState from '../../../Components/GeneralEmptyState.jsx';
import MainLoader from '../../../Components/MainLoader.jsx';
import DashboardBackButton from '../../../Components/DashboardBackButton.jsx';
import DeleteConfirmationModal from '../../../Components/DeleteConfirmationModal.jsx';
import { formatDate } from '../../../utils/dateFormat.js';
import { formatCurrency } from '../../../utils/currency.js';
import { showSuccessToast, showErrorToast, showLoadingModal, closeModal } from '../../../Components/ActionMessageModel.jsx';
import { salesLeadAPI, businessAPI, getApiConfig } from '../../../utils/api.js';
import { subUserService } from '../../../services/subUserService';


// ─────────────────────────────────────────────────────────────────────────────

const UOM_OPTIONS = ['Nos', 'Kg', 'MT', 'Litre', 'Box', 'Set', 'Pair', 'Sq.ft', 'Sq.m', 'Mtr', 'RMt'];
const SOURCE_OPTIONS = ['Website', 'Referral', 'Cold Call', 'Exhibition', 'LinkedIn', 'Email Campaign', 'Walk-in', 'Partner'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const STATUS_OPTS = [
    { label: 'Show All', value: 'all' },
    { label: 'Show Open', value: 'open' },
    { label: 'Show Converted', value: 'converted' },
    { label: 'Show Closed', value: 'closed' },
];

const DEMO_LEADS = [
    { id: 'SL-001', dbId: 1, title: 'ERP Software Implementation', value: 450000, uoms: ['Nos', 'Set'], email: 'rajesh@techcorp.com', phone: '+91 98765 43210', source: 'Referral', probability: 75, priority: 'High', dateAdded: '2026-04-01', status: 'open', assignedTo: 'Amit Sharma', closedBy: '', closeComment: '', activityLog: [{ time: '2026-04-01 10:00', note: 'Lead created' }, { time: '2026-04-05 14:30', note: 'Initial call done' }], files: [] },
    { id: 'SL-002', dbId: 2, title: 'Industrial Pump Supply', value: 185000, uoms: ['Nos'], email: 'priya@industries.in', phone: '+91 87654 32109', source: 'Exhibition', probability: 50, priority: 'Medium', dateAdded: '2026-04-10', status: 'converted', assignedTo: 'Sneha Patel', closedBy: 'Sneha Patel', closeComment: 'PO received.', activityLog: [{ time: '2026-04-10 09:00', note: 'Lead created' }, { time: '2026-04-25 16:00', note: 'Converted' }], files: ['Proposal_Pump.pdf'] },
    { id: 'SL-003', dbId: 3, title: 'Steel Structure Fabrication', value: 320000, uoms: ['MT', 'Kg'], email: 'vikram@steelco.com', phone: '+91 76543 21098', source: 'Cold Call', probability: 20, priority: 'Low', dateAdded: '2026-04-15', status: 'closed', assignedTo: 'Rahul Verma', closedBy: 'Rahul Verma', closeComment: 'Client chose competitor.', activityLog: [{ time: '2026-04-15 10:00', note: 'Lead created' }], files: [] },
];

// ── Small reusable sub-components ────────────────────────────────────────────

function PriorityBadge({ value }) {
    const cls = value === 'High' ? 'bg-red-100 text-red-700' : value === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}><span>{value || '–'}</span></span>;
}

function StatusPill({ status }) {
    const map = {
        open: 'bg-amber-50 text-amber-700 border-amber-200',
        converted: 'bg-green-50 text-green-700 border-green-300',
        closed: 'bg-gray-100 text-gray-600 border-gray-300',
    };
    const icons = { open: <Clock size={10} />, converted: <CheckCircle size={10} />, closed: <XCircle size={10} /> };
    return (
        <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[11px] font-medium ${map[status] || map.open}`}>
            <span>{icons[status]}</span> <span>{(status || '').charAt(0).toUpperCase() + (status || '').slice(1)}</span>
        </span>
    );
}

function ProbBar({ value }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-700 w-8"><span>{value}%</span></span>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${value}%`, background: '#129046' }} />
            </div>
        </div>
    );
}

function UOMInput({ selected, onChange }) {
    const [sel, setSel] = useState('');
    const [customUOM, setCustomUOM] = useState('');

    const add = () => {
        const valueToAdd = sel === 'Other' ? customUOM.trim() : sel;
        if (!valueToAdd || selected.includes(valueToAdd)) return;
        onChange([...selected, valueToAdd]);
        setSel('');
        setCustomUOM('');
    };

    const remove = (u) => onChange(selected.filter((x) => x !== u));

    return (
        <div>
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <select
                        value={sel}
                        onChange={(e) => setSel(e.target.value)}
                        className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                    >
                        <option value="">Select UOM</option>
                        {UOM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        <option value="Other">+ Other</option>
                    </select>
                    {sel !== 'Other' && (
                        <button
                            type="button"
                            onClick={add}
                            className="px-3 py-2 rounded-lg text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(to right,#129046,#9ccc53)' }}
                        >
                            +
                        </button>
                    )}
                </div>

                {sel === 'Other' && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter custom UOM"
                            value={customUOM}
                            onChange={(e) => setCustomUOM(e.target.value)}
                            className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={add}
                            className="px-3 py-2 rounded-lg text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(to right,#3b82f6,#8b5cf6)' }}
                        >
                            +
                        </button>
                    </div>
                )}
            </div>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {selected.map((u) => {
                        const isCustom = !UOM_OPTIONS.includes(u);
                        const cls = isCustom
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-green-50 border-green-200 text-green-800';
                        return (
                            <span key={u} className={`inline-flex items-center gap-1 ${cls} border rounded-full px-2.5 py-0.5 text-[10px] font-semibold`}>
                                <span>{u}</span><button type="button" onClick={() => remove(u)} className="text-red-400 hover:text-red-600 leading-none"><span>×</span></button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function FileUploadArea({ files, onChange }) {
    const inputRef = useRef();
    const { backendURL } = getApiConfig();

    const handleFiles = async (e) => {
        const selected = Array.from(e.target.files);
        if (!selected.length) return;

        showLoadingModal('Uploading file...');
        try {
            const newFiles = [];
            for (const file of selected) {
                const res = await businessAPI.uploadFile(file);
                if (res.success) {
                    newFiles.push({ name: res.filename, url: res.file_url });
                }
            }
            onChange([...files, ...newFiles]);
            showSuccessToast('File uploaded successfully');
        } catch (error) {
            showErrorToast('Upload failed');
        } finally {
            closeModal();
            e.target.value = '';
        }
    };

    const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

    return (
        <div>
            <div onClick={() => inputRef.current.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-xs text-gray-500 cursor-pointer hover:border-green-600 hover:text-green-700 transition-colors bg-gray-50/50">
                <Upload size={20} className="mx-auto mb-2 text-gray-400" /> <span>Click to upload proposal (PDF, DOCX, XLSX…)</span>
                <input type="file" ref={inputRef} multiple className="hidden" onChange={handleFiles} />
            </div>
            {files.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                    {files.map((f, i) => {
                        const isObj = f && typeof f === 'object';
                        const name = isObj ? (f.name || 'Untitled File') : f;
                        const url = isObj ? f.url : null;
                        return (
                            <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-[11px] text-green-800 font-medium">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} />
                                    {url ? (
                                        <a href={`${backendURL}${url}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-700">
                                            {name}
                                        </a>
                                    ) : (
                                        <span>{name}</span>
                                    )}
                                </div>
                                <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-base leading-none"><span>×</span></button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Field({ label, children, required }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700"><span>{label}</span>{required && <span className="text-red-500 ml-0.5"><span>*</span></span>}</label>
            {children}
        </div>
    );
}
const inputCls = 'border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none transition-colors w-full';

// ── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, maxWidth = 'max-w-2xl', children }) {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`bg-white rounded-xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto p-6 relative`}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-yellow-900"><span>{title}</span></h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none"><span>×</span></button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}

// ── Lead form (shared between add & edit) ────────────────────────────────────
const emptyForm = () => ({
    title: '', value: '', uoms: [], email: '', phone: '',
    source: '', probability: '', priority: '', dateAdded: new Date().toISOString().split('T')[0],
    assignedTo: '', leadNo: '', files: [],
});

function LeadForm({ form, onChange, subUsers = [] }) {
    const set = (k, v) => onChange({ ...form, [k]: v });
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Lead Title" required>
                    <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter lead title" />
                </Field>
                <Field label="Estimated Value" required>
                    <input className={inputCls} type="number" value={form.value} onChange={(e) => set('value', e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="UOM (Multiple)">
                    <UOMInput selected={form.uoms} onChange={(v) => set('uoms', v)} />
                </Field>
                <Field label="Lead Source">
                    <select className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)}>
                        <option value="">Select Source</option>
                        {SOURCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Customer Email">
                    <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="customer@email.com" />
                </Field>
                <Field label="Customer Phone">
                    <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </Field>
                <Field label="Probability (%)">
                    <input className={inputCls} type="number" min="0" max="100" value={form.probability} onChange={(e) => set('probability', e.target.value)} placeholder="0–100" />
                </Field>
                <Field label="Priority">
                    <select className={inputCls} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                        <option value="">Select Priority</option>
                        {PRIORITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Date Added">
                    <input className={inputCls} type="date" value={form.dateAdded} onChange={(e) => set('dateAdded', e.target.value)} />
                </Field>
                <Field label="Assigned To">
                    <SearchableDropdown
                        options={subUsers.map(u => u.name)}
                        value={form.assignedTo}
                        onChange={(val) => set('assignedTo', val)}
                        placeholder="Name or team"
                        allowCustom={true}
                    />
                </Field>
                <Field label="Sales Lead No">
                    <input className={inputCls} value={form.leadNo} onChange={(e) => set('leadNo', e.target.value)} placeholder="Auto / Manual" />
                </Field>
            </div>
            <Field label="Upload Proposal (if sent)">
                <FileUploadArea files={form.files} onChange={(v) => set('files', v)} />
            </Field>
        </div>
    );
}

// ── Preview panel ─────────────────────────────────────────────────────────────
function LeadPreview({ lead, onBack, onEdit, onClose: onCloseLead, onActivity, onUpload, currency }) {
    const { backendURL } = getApiConfig();
    const btnGreen = 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5';
    const btnBlue = 'bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5';
    const btnRed = 'bg-red-600 text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5';

    const info = [
        { label: 'Lead No', value: lead.id },
        { label: 'Status', value: <StatusPill status={lead.status} /> },
        { label: 'Priority', value: <PriorityBadge value={lead.priority} /> },
        { label: 'Probability', value: <ProbBar value={lead.probability} /> },
        { label: 'Estimated Value', value: formatCurrency(lead.value, currency) },
        { label: 'UOM', value: lead.uoms?.join(', ') || '–' },
        { label: 'Source', value: lead.source || '–' },
        { label: 'Customer Email', value: lead.email || '–' },
        { label: 'Customer Phone', value: lead.phone || '–' },
        { label: 'Date Added', value: formatDate(lead.dateAdded) },
        { label: 'Assigned To', value: lead.assignedTo || '–' },
        { label: 'Closed By', value: lead.closedBy || '–' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 w-full">
            {/* Fixed Header */}
            <div className="fixed top-16 left-0 lg:left-60 right-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 py-2 sm:py-3 shadow-sm transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full max-w-7xl mx-auto gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={onBack} className="p-1.5 border border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 group transition-colors">
                            <ArrowLeft className="w-4 h-4 text-yellow-900 group-hover:text-green-700" />
                        </button>
                        <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                            Lead Preview — {lead.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-end">
                        <button onClick={() => onEdit(lead)} className={btnBlue}><Edit2 size={13} /> Edit</button>
                        <button onClick={() => onActivity(lead)} className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:bg-yellow-100 transition-colors flex items-center gap-1.5">
                            <MessageSquare size={13} /> <span translate="no">Activity ({lead.activityLog?.length || 0})</span>
                        </button>
                        <button onClick={() => onUpload(lead)} className="bg-purple-50 text-purple-700 border border-purple-200 rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:bg-purple-100 transition-colors flex items-center gap-1.5">
                            <Upload size={13} /> <span translate="no">{lead.files?.length > 0 ? `${lead.files.length} File${lead.files.length > 1 ? 's' : ''}` : 'Upload'}</span>
                        </button>
                        {lead.status === 'open' && (
                            <button onClick={() => onCloseLead(lead)} className={btnRed}><XCircle size={13} /> Close Lead</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="pt-24 pb-10 px-4 md:px-8 max-w-5xl mx-auto">
                {/* Title card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900"><span>{lead.title}</span></h2>
                            <p className="text-sm text-gray-500 mt-1"><span>Lead · {lead.id}</span></p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0 bg-green-50 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
                            <div className="text-xl sm:text-2xl font-bold text-green-700"><span>{formatCurrency(lead.value, currency)}</span></div>
                            <p className="text-xs text-gray-400 mt-0.5"><span>Estimated Value</span></p>
                        </div>
                    </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                    {info.map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-hidden">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1"><span>{label}</span></p>
                            <div className="text-sm font-semibold text-gray-800 break-all"><span>{value}</span></div>
                        </div>
                    ))}
                </div>

                {/* Close Comment */}
                {lead.closeComment && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1"><span>Closing Remark</span></p>
                        <p className="text-sm text-red-800"><span>{lead.closeComment}</span></p>
                    </div>
                )}

                {/* Activity Log */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MessageSquare size={14} className="text-green-600" /> <span>Activity Log</span>
                    </h3>
                    {lead.activityLog?.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                            {[...lead.activityLog].reverse().map((a, i) => (
                                <li key={i} className="flex justify-between items-start py-2.5 gap-3">
                                    <span className="text-sm text-gray-700"><span>{a.note}</span></span>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap"><span>{a.time}</span></span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-400 italic"><span>No activity recorded yet.</span></p>
                    )}
                </div>

                {/* Uploaded Files */}
                {lead.files?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FileText size={14} className="text-purple-600" /> <span>Uploaded Proposals</span>
                        </h3>
                        <div className="flex flex-col gap-2">
                            {lead.files.map((f, i) => {
                                const isObj = f && typeof f === 'object';
                                const name = isObj ? (f.name || 'Untitled File') : f;
                                const url = isObj ? f.url : null;
                                return (
                                    <div key={i} className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-800 font-medium">
                                        <FileText size={14} />
                                        {url ? (
                                            <a href={`${backendURL}${url}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-purple-900">
                                                {name}
                                            </a>
                                        ) : (
                                            <span>{name}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalesLeadView({ currency, checkBusiness }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ── View mode (mirrors Quotation.jsx pattern) ──
    const [viewMode, setViewMode] = useState(() => {
        const mode = searchParams.get('mode');
        return mode || 'list';
    });

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState(STATUS_OPTS[1]);
    const [sort, setSort] = useState({ key: 'dateAdded', dir: 'desc' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [dateRangeLabel, setDateRangeLabel] = useState('All Dates');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // Modals
    const [editingRow, setEditingRow] = useState(null);
    const [previewLead, setPreviewLead] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Close lead modal
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [closingLead, setClosingLead] = useState(null);
    const [closeComment, setCloseComment] = useState('');
    const [closedBy, setClosedBy] = useState('');
    const [markConverted, setMarkConverted] = useState(false);

    // Activity modal
    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [activityLead, setActivityLead] = useState(null);
    const [newActivity, setNewActivity] = useState('');

    // Upload modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [subUsers, setSubUsers] = useState([]);

    // Fetch sub-users for assignment
    useEffect(() => {
        const fetchSubUsers = async () => {
            try {
                const res = await subUserService.getSubUsers();
                if (res.success) {
                    setSubUsers(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch sub-users:", error);
            }
        };
        fetchSubUsers();
    }, []);
    const [uploadingLead, setUploadingLead] = useState(null);

    // Add form
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState(emptyForm);


    // ── Sync viewMode with URL (mirrors Quotation.jsx) ──
    useEffect(() => {
        const mode = searchParams.get('mode');
        setViewMode(mode || 'list');
    }, [searchParams]);

    // ── Load leads from API ──
    useEffect(() => {
        if (viewMode !== 'list') return;
        const load = async () => {
            setLoading(true);
            try {
                const businessId = localStorage.getItem('selectedBusinessId');
                if (!businessId) {
                    showErrorToast('Business ID not found');
                    return;
                }
                const response = await salesLeadAPI.getAll(businessId);
                if (response.success) {
                    setRows(response.data.map(lead => ({
                        ...lead,
                        dbId: lead.id,
                        id: lead.lead_no,
                        dateAdded: lead.date_added,
                        assignedTo: lead.assigned_to,
                        closeComment: lead.close_comment,
                        closedBy: lead.closed_by,
                        activityLog: lead.activity_log
                    })));
                } else {
                    throw new Error(response.message);
                }
            } catch (err) {
                showErrorToast('Failed to load leads');
                setRows([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [viewMode]);

    // ── Filtered + sorted leads ──
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const { start, end } = getRangeBoundsPure(dateRangeLabel, customRange) || {};

        let list = rows.filter((r) => {
            const matchSearch = !q || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q) || (r.assignedTo || '').toLowerCase().includes(q);

            const matchStatus = status.value === 'all' || r.status === status.value;

            let matchDate = true;
            if (start && end && r.dateAdded) {
                const d = new Date(r.dateAdded);
                matchDate = d >= start && d <= end;
            }

            return matchSearch && matchStatus && matchDate;
        });

        list.sort((a, b) => {
            const dir = sort.dir === 'asc' ? 1 : -1;
            if (sort.key === 'value') return (Number(a.value) - Number(b.value)) * dir;
            if (sort.key === 'dateAdded') return (new Date(a.dateAdded) - new Date(b.dateAdded)) * dir;
            if (sort.key === 'probability') return (Number(a.probability) - Number(b.probability)) * dir;
            return String(a[sort.key] || '').localeCompare(String(b[sort.key] || '')) * dir;
        });
        return list;
    }, [rows, query, status, sort, dateRangeLabel, customRange]);

    // ── Helpers ──
    const updateLead = (id, patch) => {
        const idStr = String(id);
        setRows((prev) => prev.map((l) => String(l.dbId) === idStr ? { ...l, ...patch } : l));
        setPreviewLead((prev) => (prev && String(prev.dbId) === idStr) ? { ...prev, ...patch } : prev);
        setActivityLead((prev) => (prev && String(prev.dbId) === idStr) ? { ...prev, ...patch } : prev);
        setUploadingLead((prev) => (prev && String(prev.dbId) === idStr) ? { ...prev, ...patch } : prev);
    };
    const nextLeadNo = () => {
        const nums = rows.map((l) => parseInt(l.id.replace(/\D/g, '')) || 0);
        return `SL-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
    };

    // ── CRUD handlers ──
    const handleCreate = () => {
        navigate('/lead-management');
    };

    const handleSaveAdd = async () => {
        if (!addForm.title.trim()) { showErrorToast('Lead Title is required'); return; }
        if (!addForm.value) { showErrorToast('Estimated Value is required'); return; }

        try {
            const businessId = localStorage.getItem('selectedBusinessId');
            const newLead = {
                business_id: businessId,
                lead_no: addForm.leadNo || nextLeadNo(),
                title: addForm.title,
                value: parseFloat(addForm.value) || 0,
                uoms: addForm.uoms,
                email: addForm.email,
                phone: addForm.phone,
                source: addForm.source,
                probability: parseInt(addForm.probability) || 0,
                priority: addForm.priority || 'Medium',
                date_added: addForm.dateAdded,
                assigned_to: addForm.assignedTo,
                files: addForm.files,
            };

            const res = await salesLeadAPI.create(newLead);
            if (res.success) {
                const createdLead = res.data;
                const mappedLead = {
                    ...createdLead,
                    dbId: createdLead.id,
                    id: createdLead.lead_no,
                    dateAdded: createdLead.date_added,
                    assignedTo: createdLead.assigned_to,
                    closeComment: createdLead.close_comment,
                    closedBy: createdLead.closed_by,
                    activityLog: createdLead.activity_log
                };
                setRows((prev) => [mappedLead, ...prev]);
                setAddModalOpen(false);
                showSuccessToast(`Lead ${mappedLead.id} created successfully`);
            } else {
                showErrorToast(res.message || 'Failed to create lead');
            }
        } catch (error) {
            showErrorToast('Error creating lead');
        }
    };

    const handleEditClick = (row) => {
        navigate(`/lead-management?id=${row.dbId}`);
    };



    const handleDeleteClick = (row) => { setItemToDelete(row); setDeleteModalOpen(true); };
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        showLoadingModal('Deleting…');
        try {
            const businessId = localStorage.getItem('selectedBusinessId');
            const res = await salesLeadAPI.delete(itemToDelete.dbId, businessId);
            if (res.success) {
                setRows((prev) => prev.filter((l) => l.dbId !== itemToDelete.dbId));
                closeModal();
                showSuccessToast(`${itemToDelete.id} deleted successfully`);
                if (previewLead?.dbId === itemToDelete.dbId) { setPreviewLead(null); setViewMode('list'); }
            } else {
                throw new Error(res.message || 'Failed to delete lead');
            }
        } catch (err) {
            closeModal();
            showErrorToast('Could not delete lead');
        } finally {
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const openCloseLead = (lead) => { setClosingLead(lead); setCloseComment(''); setClosedBy(''); setMarkConverted(false); setCloseModalOpen(true); };
    const confirmClose = async () => {
        if (!closeComment.trim()) { showErrorToast('Please enter a closing comment'); return; }
        try {
            const businessId = localStorage.getItem('selectedBusinessId');
            const patch = {
                status: markConverted ? 'converted' : 'closed',
                close_comment: closeComment,
                closed_by: closedBy,
                activity_log: [...(closingLead.activityLog || []), { time: new Date().toLocaleString(), note: `Lead ${markConverted ? 'converted' : 'closed'}. ${closeComment}` }],
            };

            const res = await salesLeadAPI.update(closingLead.dbId, { ...patch, business_id: businessId });
            if (res.success) {
                const localPatch = {
                    status: patch.status,
                    closeComment: patch.close_comment,
                    closedBy: patch.closed_by,
                    activityLog: patch.activity_log
                };
                updateLead(closingLead.dbId, localPatch);
                if (previewLead?.dbId === closingLead.dbId) setPreviewLead({ ...previewLead, ...localPatch });
                setCloseModalOpen(false);
                showSuccessToast(`Lead ${markConverted ? 'converted' : 'closed'} successfully`);
            } else {
                showErrorToast(res.message || `Failed to ${markConverted ? 'convert' : 'close'} lead`);
            }
        } catch (error) {
            showErrorToast(`Error ${markConverted ? 'converting' : 'closing'} lead`);
        }
    };

    const handleStatusChange = async (lead, newStatus) => {
        if (lead.status === newStatus) return;
        try {
            const businessId = localStorage.getItem('selectedBusinessId');
            const patch = {
                status: newStatus,
                activity_log: [...(lead.activityLog || []), {
                    time: new Date().toLocaleString(),
                    note: `Status changed to ${newStatus} from list view`
                }],
            };
            const res = await salesLeadAPI.update(lead.dbId, { ...patch, business_id: businessId });
            if (res.success) {
                const localPatch = { status: newStatus, activityLog: patch.activity_log };
                updateLead(lead.dbId, localPatch);
                if (previewLead?.dbId === lead.dbId) setPreviewLead({ ...previewLead, ...localPatch });
                showSuccessToast(`Status updated to ${newStatus}`);
            } else {
                showErrorToast(res.message || 'Failed to update status');
            }
        } catch (error) {
            showErrorToast('Error updating status');
        }
    };

    const openActivity = (lead) => {
        const live = rows.find((l) => l.dbId === lead.dbId) || lead;
        setActivityLead(live);
        setNewActivity('');
        setActivityModalOpen(true);
    };
    const addActivity = async () => {
        if (!newActivity.trim()) return;
        try {
            const businessId = localStorage.getItem('selectedBusinessId');
            const entry = { time: new Date().toLocaleString(), note: newActivity.trim() };
            const updated = [...(activityLead.activityLog || []), entry];

            const res = await salesLeadAPI.update(activityLead.dbId, { activity_log: updated, business_id: businessId });
            if (res.success) {
                updateLead(activityLead.dbId, { activityLog: updated });
                setNewActivity('');
                showSuccessToast('Activity added');
            } else {
                showErrorToast(res.message || 'Failed to add activity');
            }
        } catch (error) {
            showErrorToast('Error adding activity');
        }
    };

    const openUpload = (lead) => {
        const live = rows.find((l) => l.dbId === lead.dbId) || lead;
        setUploadingLead(live);
        setUploadModalOpen(true);
    };
    const updateFiles = async (files) => {
        try {
            const businessId = localStorage.getItem('selectedBusinessId');
            const res = await salesLeadAPI.update(uploadingLead.dbId, { files, business_id: businessId });
            if (res.success) {
                updateLead(uploadingLead.dbId, { files });
                showSuccessToast('Files updated');
            } else {
                showErrorToast(res.message || 'Failed to update files');
            }
        } catch (error) {
            showErrorToast('Error updating files');
        }
    };

    const handleBackToList = () => {
        setPreviewLead(null);
        setViewMode('list');
        localStorage.removeItem('salesLeadViewMode');
        navigate('/sales-leads');
    };

    // ── Button style ──
    const btnGreen = 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5';
    const btnRed = 'bg-red-600 text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5';

    // ── Loading ──
    if (loading) return <MainLoader message="Loading sales leads…" />;

    // ── Preview mode ──
    if (viewMode === 'preview' && previewLead) {
        return (
            <>
                <LeadPreview
                    lead={previewLead}
                    currency={currency}
                    onBack={handleBackToList}
                    onEdit={handleEditClick}
                    onClose={openCloseLead}
                    onActivity={openActivity}
                    onUpload={openUpload}
                />
                {/* Modals are still rendered here so they can open from preview */}
                <CloseModal open={closeModalOpen} onClose={() => setCloseModalOpen(false)} comment={closeComment} setComment={setCloseComment} closedBy={closedBy} setClosedBy={setClosedBy} markConverted={markConverted} setMarkConverted={setMarkConverted} onConfirm={confirmClose} />
                <ActivityModal open={activityModalOpen} onClose={() => setActivityModalOpen(false)} lead={activityLead} newActivity={newActivity} setNewActivity={setNewActivity} onAdd={addActivity} />
                <UploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} lead={uploadingLead} onFilesChange={updateFiles} />
            </>
        );
    }

    // ── Table columns (mirrors Quotation.jsx columns structure) ──
    const columns = [
        {
            key: 'id',
            title: 'Lead No',
            sortable: true,
            render: (r) => (
                <div className="flex items-center gap-2">

                    <span className="text-sm font-medium text-gray-700 uppercase tracking-tight">{r.id}</span>
                </div>
            ),
        },
        {
            key: 'title',
            title: 'Lead Title',
            sortable: true,
            render: (r) => <span className="text-sm text-gray-800 max-w-[160px] block truncate" title={r.title}>{r.title}</span>,
        },
        {
            key: 'value',
            title: 'Estim. Value',
            sortable: true,
            tdClass: 'text-right',
            render: (r) => <span className="text-sm text-gray-800">{formatCurrency(r.value, currency)}</span>,
        },
        {
            key: 'uoms',
            title: 'UOM',
            sortable: false,
            render: (r) => <span className="text-sm text-gray-600">{r.uoms?.join(', ') || '–'}</span>,
        },
        {
            key: 'email',
            title: 'Cust. Email',
            sortable: false,
            render: (r) => <span className="text-sm text-gray-600 truncate max-w-[140px] block" title={r.email}>{r.email || '–'}</span>,
        },
        {
            key: 'phone',
            title: 'Phone',
            sortable: false,
            render: (r) => <span className="text-sm text-gray-600">{r.phone || '–'}</span>,
        },
        {
            key: 'source',
            title: 'Lead Source',
            sortable: true,
            render: (r) => r.source ? <span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">{r.source}</span> : '–',
        },
        {
            key: 'probability',
            title: 'Probability',
            sortable: true,
            render: (r) => <ProbBar value={r.probability} />,
        },
        {
            key: 'priority',
            title: 'Priority',
            sortable: true,
            render: (r) => <PriorityBadge value={r.priority} />,
        },
        {
            key: 'dateAdded',
            title: 'Date Added',
            sortable: true,
            render: (r) => <span className="text-sm text-gray-600">{formatDate(r.dateAdded)}</span>,
        },
        {
            key: 'status',
            title: 'Status',
            sortable: false,
            render: (r) => (
                <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={r.status === 'converted'}
                    className={`text-[11px] font-medium border rounded-full px-2 py-0.5 focus:outline-none cursor-pointer transition-colors ${r.status === 'converted' ? 'bg-green-50 text-green-700 border-green-300 !cursor-not-allowed' :
                        r.status === 'open' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-gray-100 text-gray-600 border-gray-300'
                        }`}
                >
                    <option value="open">Open</option>
                    <option value="converted">Converted</option>
                    <option value="closed">Closed</option>
                </select>
            ),
        },
        {
            key: 'activityLog',
            title: 'Activity Log',
            sortable: false,
            render: (r) => {
                const last = r.activityLog?.[r.activityLog.length - 1]?.note || '–';
                return (
                    <div>

                        <button
                            onClick={(e) => { e.stopPropagation(); openActivity(r); }}
                            className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold hover:bg-yellow-100 transition-colors"
                        >
                            <MessageSquare size={9} /> <span translate="no">Log ({r.activityLog?.length || 0})</span>
                        </button>
                    </div>
                );
            },
        },
        {
            key: 'assignedTo',
            title: 'Assigned To',
            sortable: true,
            render: (r) => r.assignedTo || '–',
        },
        {
            key: 'closedBy',
            title: 'Closed By',
            sortable: false,
            render: (r) => (
                <div className="max-w-[110px]">
                    <div className="text-[11px]">{r.closedBy || '–'}</div>
                    {r.closeComment && <div className="text-[10px] text-gray-400 truncate" title={r.closeComment}>{r.closeComment}</div>}
                </div>
            ),
        },
        {
            key: 'files',
            title: 'Proposal',
            sortable: false,
            render: (r) => (
                <button
                    onClick={(e) => { e.stopPropagation(); openUpload(r); }}
                    className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold hover:bg-purple-100 transition-colors whitespace-nowrap"
                >
                    <Upload size={9} /> <span translate="no">{r.files?.length > 0 ? `${r.files.length} file${r.files.length > 1 ? 's' : ''}` : 'Upload'}</span>
                </button>
            ),
        },
    ];

    // ── List View ──
    return (
        <div className="bg-white min-h-screen w-full rounded-xl mt-4 border border-gray-200 shadow-sm overflow-hidden">
            {/* Standard Toolbar */}
            <div className="bg-white border-b border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
                    <div className="mr-auto">
                        <DashboardBackButton />
                    </div>
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search leads…"
                            className="w-full sm:w-56 h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:outline-none transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search size={18} />
                        </div>
                    </div>

                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 shadow-inner">
                        {STATUS_OPTS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setStatus(opt)}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${
                                    status.value === opt.value
                                        ? 'bg-white text-green-700 shadow-sm border border-gray-100'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                                }`}
                            >
                                {opt.label.replace('Show ', '')}
                            </button>
                        ))}
                    </div>

                    <Date_wise_Filter_Button
                        dateRangeLabel={dateRangeLabel}
                        onRangeChange={setDateRangeLabel}
                        customRange={customRange}
                        onRangeApply={setCustomRange}
                    />

                    <button
                        onClick={handleCreate}
                        className="bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-xl px-3 py-2 text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform active:scale-95"
                    >
                        <Plus size={18} /> New
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {!loading && rows.length === 0 && (
                <GeneralEmptyState
                    title="No Sales Leads Found"
                    description="Start by adding your first lead to track potential sales opportunities."
                    buttonText="Create First Lead"
                    onButtonClick={handleCreate}
                    icon={TrendingUp}
                />
            )}

            {/* Table */}
            {rows.length > 0 && (
                <ReusableTable
                    columns={columns}
                    data={filtered}
                    rowKey={(r) => r.id}
                    initialPageSize={10}
                    onRowClick={(row) => { setPreviewLead(row); setViewMode('preview'); navigate('/sales-leads?mode=preview'); }}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    sortState={sort}
                    onSortChange={setSort}
                />
            )}

            {/* ── Modals ── */}

            {/* Add Lead Modal */}
            <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Lead">
                <LeadForm form={addForm} onChange={setAddForm} subUsers={subUsers} />
                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 mt-4">
                    <button onClick={() => setAddModalOpen(false)} className={btnRed}>Cancel</button>
                    <button onClick={handleSaveAdd} className={btnGreen}>Save Lead</button>
                </div>
            </Modal>



            {/* Close Lead Modal */}
            <CloseModal open={closeModalOpen} onClose={() => setCloseModalOpen(false)} comment={closeComment} setComment={setCloseComment} closedBy={closedBy} setClosedBy={setClosedBy} markConverted={markConverted} setMarkConverted={setMarkConverted} onConfirm={confirmClose} />

            {/* Activity Log Modal */}
            <ActivityModal open={activityModalOpen} onClose={() => setActivityModalOpen(false)} lead={activityLead} newActivity={newActivity} setNewActivity={setNewActivity} onAdd={addActivity} />

            {/* Upload Modal */}
            <UploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} lead={uploadingLead} onFilesChange={updateFiles} />

            {/* Delete Confirmation */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.id || ''}
                itemType="sales lead"
            />
        </div>
    );
}

// ── Extracted modal components (keeps main component readable) ────────────────

function EditLeadModal({ open, onClose, form, setForm, onSave }) {
    const btnGreen = 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5';
    const btnRed = 'bg-red-600 text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5';
    if (!form) return null;
    return (
        <Modal open={open} onClose={onClose} title="Edit Lead">
            <LeadForm form={form} onChange={setForm} />
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 mt-4">
                <button onClick={onClose} className={btnRed}>Cancel</button>
                <button onClick={onSave} className={btnGreen}>Update Lead</button>
            </div>
        </Modal>
    );
}

function CloseModal({ open, onClose, comment, setComment, closedBy, setClosedBy, markConverted, setMarkConverted, onConfirm }) {
    const btnRed = 'bg-red-600 text-white rounded-[7px] px-4 py-2 text-xs font-semibold hover:bg-red-700 transition-colors';
    return (
        <Modal open={open} onClose={onClose} title="Close Lead" maxWidth="max-w-md">
            <p className="text-sm text-gray-500 mb-4">Provide a reason for closing this lead.</p>
            <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Closing Comment <span className="text-red-500">*</span></label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none w-full resize-y" rows={3} placeholder="Reason for closing…" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={markConverted} onChange={(e) => setMarkConverted(e.target.checked)} className="w-4 h-4 accent-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Mark as Converted </span>
                </label>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Closed By</label>
                    <input className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none w-full" value={closedBy} onChange={(e) => setClosedBy(e.target.value)} placeholder="Enter name" />
                </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 mt-4">
                <button onClick={onClose} className="border-2 border-gray-200 rounded-[7px] px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={onConfirm} className={btnRed}>Confirm Close</button>
            </div>
        </Modal>
    );
}

function ActivityModal({ open, onClose, lead, newActivity, setNewActivity, onAdd }) {
    const btnGreen = 'bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-[7px] px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5';
    return (
        <Modal open={open} onClose={onClose} title="Activity Log" maxWidth="max-w-lg">
            <div className="flex gap-2 mb-4">
                <input
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="Add activity note…"
                    onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                />
                <button onClick={onAdd} className={btnGreen}>Add</button>
            </div>
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {lead && [...(lead.activityLog || [])].reverse().map((a, i) => (
                    <li key={i} className="flex justify-between items-start py-2.5 gap-3">
                        <span className="text-sm text-gray-700">{a.note}</span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{a.time}</span>
                    </li>
                ))}
                {(!lead || !lead.activityLog?.length) && <li className="py-6 text-center text-sm text-gray-400 italic"><span>No activity yet</span></li>}
            </ul>
        </Modal>
    );
}

function UploadModal({ open, onClose, lead, onFilesChange }) {
    const btnGray = 'border-2 border-gray-200 rounded-[7px] px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors';
    return (
        <Modal open={open} onClose={onClose} title="Upload Proposal" maxWidth="max-w-md">
            {lead && <FileUploadArea files={lead.files || []} onChange={onFilesChange} />}
            <div className="flex justify-end mt-4 border-t border-gray-200 pt-4">
                <button onClick={onClose} className={btnGray}>Close</button>
            </div>
        </Modal>
    );
}
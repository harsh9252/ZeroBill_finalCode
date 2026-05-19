import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Loader, RotateCw, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { backendUrl } from '../../../config/appConfig';
import { useActionMessage } from '../../../contexts/ActionMessageContext';
import './DemoManagement.css';

export default function DemoManagement() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [bookedSlots, setBookedSlots] = useState([]); // Combined GCal + Overrides + Sundays
    const [overrides, setOverrides] = useState([]); // Only DB Overrides
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState({}); // { 'date-time': true }
    
    const { showSuccess, showError, showDelete, showCustomModal } = useActionMessage();
    const [expandedSlot, setExpandedSlot] = useState(null); // time string
    const [actionLoading, setActionLoading] = useState(false);

    // Date status hooks
    const isPastSelectedDate = useMemo(() => {
        if (!selectedDate) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const sel = new Date(selectedDate);
        sel.setHours(0, 0, 0, 0);
        return sel.getTime() < now.getTime();
    }, [selectedDate]);

    const isSundaySelected = useMemo(() => {
        return selectedDate && selectedDate.getDay() === 0;
    }, [selectedDate]);

    const hasBookedDemosOnSelectedDate = useMemo(() => {
        if (!selectedDate) return false;
        const d_sel = new Date(selectedDate);
        const d_fmt = `${d_sel.getFullYear()}-${String(d_sel.getMonth() + 1).padStart(2, '0')}-${String(d_sel.getDate()).padStart(2, '0')}`;
        return bookedSlots.some(slot => slot.date === d_fmt && slot.type === 'booked');
    }, [selectedDate, bookedSlots]);

    // Reset expanded slot when date changes
    useEffect(() => {
        setExpandedSlot(null);
    }, [selectedDate]);

    const AVAILABLE_TIMES = [
        '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    ];

    const fetchData = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const token = localStorage.getItem('superAdminToken');
            
            // Fetch booked slots (public view logic)
            const publicRes = await fetch(`${backendUrl}/api/calendar/booked-slots`);
            const publicData = await publicRes.json();
            
            // Fetch raw overrides (admin only)
            const adminRes = await fetch(`${backendUrl}/api/superadmin/demo/availability`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const adminData = await adminRes.json();

            if (publicData.success && adminData.success) {
                setBookedSlots(publicData.bookedSlots);
                setOverrides(adminData.overrides);
            } else {
                showError('Failed to fetch demo settings.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            showError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true);
    }, []);

    const handleToggleSlot = async (dateStr, slotTime, targetIsAvailable) => {
        const slotId = `${dateStr}-${slotTime}`;
        try {
            setLoadingSlots(prev => ({ ...prev, [slotId]: true }));
            setActionLoading(true);
            const token = localStorage.getItem('superAdminToken');
            const response = await fetch(`${backendUrl}/api/superadmin/demo/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    override_date: dateStr,
                    slot_time: slotTime,
                    is_available: targetIsAvailable,
                    reason: 'Admin Manual Override'
                })
            });

            const data = await response.json();
            if (data.success) {
                await fetchData();
                showSuccess('Success', `Slot ${slotTime} on ${dateStr} updated.`);
            } else {
                showError('Error', data.message);
            }
        } catch (err) {
            showError('Update failed.');
        } finally {
            setLoadingSlots(prev => {
                const updated = { ...prev };
                delete updated[slotId];
                return updated;
            });
            setActionLoading(false);
        }
    };

    const handleToggleDay = async (dateStr, targetIsAvailable) => {
        // Validation 1: No Leave if demos are already booked (Show listing modal)
        if (!targetIsAvailable) {
            // Filter to only count what is visually shown:
            // 1. Must be in AVAILABLE_TIMES
            // 2. Only count one booking per time slot (matches UI find() logic)
            const dateBookingsRaw = bookedSlots.filter(slot => 
                slot.date === dateStr && 
                slot.type === 'booked' && 
                AVAILABLE_TIMES.includes(slot.time)
            );

            // Deduplicate by time to match the .find() behavior in the render loop
            const uniqueTimeBookings = [];
            const seenTimes = new Set();
            for (const b of dateBookingsRaw) {
                if (!seenTimes.has(b.time)) {
                    seenTimes.add(b.time);
                    uniqueTimeBookings.push(b);
                }
            }

            const bookedCount = uniqueTimeBookings.length;
            
            if (bookedCount > 0) {
                // Generate detailed HTML list of demos
                const demoListHtml = uniqueTimeBookings.map(demo => `
                    <div class="flex items-center justify-between p-2 mb-2 bg-white rounded-lg border border-red-100 shadow-sm text-left">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">${demo.time}</span>
                            <div class="flex flex-col">
                                <span class="text-[11px] font-bold text-gray-800 truncate max-w-[120px]">${demo.summary.split(':')[0] || 'Demo'}</span>
                                <span class="text-[9px] text-gray-500">${demo.summary.split(':')[1]?.trim() || ''}</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                showCustomModal({
                    title: 'Action Denied',
                    html: `
                        <div class="flex flex-col items-center text-center py-2 px-2">
                            <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shadow-sm border border-red-100 mb-3">
                                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 mb-1">Leave Request Denied</h3>
                            <p class="text-gray-600 text-[13px] mb-4">
                                You cannot take leave today as there are <span class="font-bold text-red-600">${bookedCount} confirmed demos</span> already scheduled:
                            </p>
                            
                            <div class="w-full max-h-[180px] overflow-y-auto mb-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                ${demoListHtml}
                            </div>

                            <div class="bg-amber-50 rounded-xl p-3 border-l-4 border-amber-400 text-left w-full">
                                <p class="text-[11px] text-amber-800 font-semibold italic">Please cancel or reschedule these demos first.</p>
                            </div>
                        </div>
                    `,
                    showCancelButton: false,
                    confirmButtonText: 'Got It',
                    confirmButtonColor: '#EF4444'
                });
                return;
            }
            
            // Validation 2: No Leave if it's Sunday (Office already off)
            if (new Date(selectedDate).getDay() === 0) {
                showError('Action Denied', 'Sundays are already non-working days.');
                return;
            }
        }

        try {
            setActionLoading(true);
            const token = localStorage.getItem('superAdminToken');
            const response = await fetch(`${backendUrl}/api/superadmin/demo/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    override_date: dateStr,
                    slot_time: 'FULL_DAY',
                    is_available: targetIsAvailable,
                    reason: targetIsAvailable ? 'Admin Reset Day' : 'Admin Full Day Leave'
                })
            });

            const data = await response.json();
            if (data.success) {
                await fetchData();
                showSuccess('Success', targetIsAvailable ? `Day ${dateStr} is now Available.` : `Day ${dateStr} is now on Leave.`);
            } else {
                showError('Error', data.message);
            }
        } catch (err) {
            showError('Leave update failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelDemo = async (eventId, slotTime) => {
        const isConfirmed = await showDelete({
            itemName: `Demo at ${slotTime}`,
            itemType: 'Booking',
            confirmText: 'Yes, Cancel it',
            cancelText: 'No, Keep it'
        });

        if (!isConfirmed) return;
        
        setExpandedSlot(slotTime);
        setActionLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/calendar/cancel-demo/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}` }
            });
            const data = await response.json();
            if (data.success) {
                showSuccess('Cancelled', 'The demo booking has been cancelled.');
                fetchData(); // Refresh slots
            } else {
                showError('Error', data.message || 'Failed to cancel demo.');
            }
        } catch (error) {
            console.error('Error cancelling demo:', error);
            showError('Error', 'An error occurred while cancelling the demo.');
        } finally {
            setActionLoading(false);
            setExpandedSlot(null);
        }
    };

    // Calendar UI logic
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const calendarDays = useMemo(() => {
        const days = [];
        const totalDays = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);

        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
        }
        return days;
    }, [currentMonth]);

    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const getDayStatus = (date) => {
        if (!date) return null;
        const isSunday = date.getDay() === 0;
        const d_fmt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dateStr = d_fmt;
        const dateBookings = bookedSlots.filter(s => s.date === dateStr && s.type === 'booked');
        const blockedSlotsForDate = overrides
            .filter(o => {
                // overrides already come pre-formatted as YYYY-MM-DD from the backend fix
                return o.override_date === dateStr && !o.is_available;
            })
            .map(o => o.slot_time);
        
        const isFullyBlocked = AVAILABLE_TIMES.every(time => {
            const isBooked = dateBookings.some(b => b.time === time);
            const isAdminBlocked = blockedSlotsForDate.includes(time);
            return isBooked || isAdminBlocked;
        });

        if (isFullyBlocked) return 'blocked';
        return isSunday ? 'holiday' : 'default';
    };

    const getDayBookings = (date) => {
        if (!date) return [];
        const d_fmt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dateStr = d_fmt;
        return bookedSlots.filter(s => s.date === dateStr && s.type === 'booked');
    };

    if (loading) return (
        <div className="flex items-center justify-center py-12 h-screen bg-gray-100">
            <Loader className="w-8 h-8 text-yellow-500 animate-spin" />
            <span className="ml-3 text-gray-600">Loading Demo Management...</span>
        </div>
    );

    return (
        <div className="px-2 sm:px-3 py-2 sm:py-3 space-y-6">
            {/* Header / Info Section */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Calendar className="text-yellow-600" /> Demo Availability Management
                            <button 
                                onClick={fetchData} 
                                disabled={loading}
                                className="ml-2 p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-all"
                                title="Refresh Data"
                            >
                                <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Manage office hours. Dates turn red when all slots are taken.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* CALENDAR COLUMN */}
                <div className="lg:col-span-5 bg-white rounded-lg shadow border border-gray-100 p-6 flex flex-col">
                    <div className="dm-grid-container w-full h-full flex flex-col justify-between">
                        <div>
                            <div className="dm-calendar-header flex justify-between items-center mb-6">
                                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronLeft />
                                </button>
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">{monthName}</h3>
                                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronRight />
                                </button>
                            </div>

                            <div className="dm-grid">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">{d}</div>
                                ))}
                                {calendarDays.map((date, idx) => {
                                    if (!date) return <div key={`empty-${idx}`} className="dm-day-cell empty" />;
                                    const status = getDayStatus(date);
                                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isHoliday = status === 'holiday';
                                    const isBlocked = status === 'blocked';
                                    
                                    return (
                                        <button
                                            type="button"
                                            key={idx}
                                            onClick={() => !isHoliday && setSelectedDate(date)}
                                            className={`dm-day-cell relative rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5
                                                ${isSelected ? 'border-yellow-500 bg-yellow-50 shadow-sm ring-2 ring-yellow-200 z-10' : ''}
                                                ${isToday && !isSelected ? 'border-blue-400 bg-blue-50/50' : ''}
                                                ${isHoliday ? 'dm-day-off' : ''}
                                                ${isBlocked && !isHoliday ? 'bg-red-50 border-red-400' : ''}
                                                ${!isHoliday && !isBlocked && !isSelected && !isToday ? 'bg-green-50 border-green-500' : ''}
                                                ${!isSelected && !isHoliday && !isBlocked ? 'hover:border-green-600 hover:bg-green-100/50' : ''}
                                            `}
                                        >
                                            <span className={`text-sm font-semibold 
                                                ${isSelected ? 'text-yellow-700' : isToday ? 'text-blue-600' : (isHoliday || isBlocked ? 'text-red-600' : 'text-green-700')}
                                            `}>
                                                {date.getDate()}
                                            </span>
                                            {isToday && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" title="Today" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="dm-legend mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-4 text-[10px] font-semibold text-gray-500 justify-center">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-green-50 border border-green-500" /> Available
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-red-50 border border-red-500" /> Fully Booked (Hidden)
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-f8fafc border border-e2e8f0 opacity-60 filter blur-[1px]" /> Sunday (OFF)
                            </div>
                        </div>
                    </div>
                </div>

                {/* SLOTS COLUMN */}
                <div className="lg:col-span-7 bg-white rounded-lg shadow border border-gray-100 p-6 flex flex-col">
                    {selectedDate ? (() => {
                        const d_sel_header = new Date(selectedDate);
                        const selectedDateStr = `${d_sel_header.getFullYear()}-${String(d_sel_header.getMonth() + 1).padStart(2, '0')}-${String(d_sel_header.getDate()).padStart(2, '0')}`;
                        const dayOverrideHeader = overrides.find(o => o.override_date === selectedDateStr && o.slot_time === 'FULL_DAY');
                        const isDayOnLeave = dayOverrideHeader && !dayOverrideHeader.is_available;

                        return (
                        <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">
                                        {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        Toggle availability for 1-hour slots.
                                    </p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner overflow-hidden">
                                    <button 
                                        type="button"
                                        disabled={actionLoading || isPastSelectedDate}
                                        onClick={() => handleToggleDay(selectedDateStr, true)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2
                                            ${!isDayOnLeave 
                                                ? 'bg-green-600 text-white shadow-md' 
                                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}
                                            ${isPastSelectedDate ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {actionLoading ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />} Available
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={actionLoading || isPastSelectedDate || isSundaySelected}
                                        onClick={() => handleToggleDay(selectedDateStr, false)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2
                                            ${isDayOnLeave 
                                                ? 'bg-red-600 text-white shadow-md' 
                                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}
                                            ${(isPastSelectedDate || isSundaySelected) ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                        title={isSundaySelected ? "Sunday is already off" : ""}
                                    >
                                        {actionLoading ? <Loader size={14} className="animate-spin" /> : <XCircle size={14} />} Leave
                                    </button>
                                </div>
                            </div>

                            <div className="dm-slots-list flex-1 grid grid-cols-1 gap-3 overflow-y-auto pr-2">
                                {AVAILABLE_TIMES.map(time => {
                                    const d_sel = new Date(selectedDate);
                                    const dateStr = `${d_sel.getFullYear()}-${String(d_sel.getMonth() + 1).padStart(2, '0')}-${String(d_sel.getDate()).padStart(2, '0')}`;
                                    const slotStatus = bookedSlots.find(s => s.date === dateStr && s.time === time);
                                    const isBooked = slotStatus?.type === 'booked';
                                    
                                    // For today, check if the hour has already passed
                                    const today_real = new Date();
                                    const isTodaySelected = selectedDate.toDateString() === today_real.toDateString();
                                    const slotHour = parseInt(time.split(':')[0], 10);
                                    // No automatic past slot blocking
                                    const isPastSlot = isTodaySelected && slotHour <= today_real.getHours();

                                    // Local override check
                                    const dayOverride = overrides.find(o => o.override_date === dateStr && o.slot_time === 'FULL_DAY');
                                    const isDayOnLeave = dayOverride && !dayOverride.is_available;

                                    const override = overrides.find(o => o.override_date === dateStr && o.slot_time === time);
                                    const isBlockedManually = override && !override.is_available;
                                    const isHoliday = selectedDate.getDay() === 0;
                                    const isEffectivelyBlocked = isBlockedManually || isHoliday || isDayOnLeave;

                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const isPastDate = new Date(selectedDate).setHours(0, 0, 0, 0) < today.getTime();
                                    // A slot is "past" if the date is in the past OR it's a past hour today
                                    const isPast = isPastDate || isPastSlot || isDayOnLeave;
                                    
                                    const attendee = slotStatus?.attendees?.[0];

                                    // Enhanced parsing helper
                                    const getDetail = (key, rawDescription) => {
                                        if (!rawDescription) return null;
                                        const regex = new RegExp(`${key}:\\s*(.*)`, 'i');
                                        const match = rawDescription.match(regex);
                                        return match ? match[1].trim() : null;
                                    };

                                    const desc = slotStatus?.description || "";
                                    const businessName = getDetail('Business', desc) || slotStatus?.summary?.split(':')?.[1]?.trim() || 'N/A';
                                    const customerName = getDetail('Name', desc) || attendee?.displayName || slotStatus?.summary?.split(':')?.[0]?.replace('InvoiceBillBook Demo', '').replace(':', '').trim() || 'N/A';
                                    const contactEmail = getDetail('Email', desc) || attendee?.email || 'N/A';
                                    const phoneNumber = getDetail('Phone', desc) || 'N/A';
                                    const enquiryType = getDetail('Enquiry Type', desc) || 'N/A';
                                    
                                    const isExpanded = expandedSlot === time;

                                    return (
                                        <div key={time} className="flex flex-col gap-1">
                                            <div 
                                                onClick={() => isBooked && setExpandedSlot(isExpanded ? null : time)}
                                                className={`p-3 rounded-lg border flex items-center justify-between transition-all shadow-sm
                                                    ${isBooked ? 'bg-red-50 border-red-200 hover:bg-red-100/50 cursor-pointer' : isEffectivelyBlocked ? 'bg-gray-50 border-gray-200' : 'bg-green-50/20 border-green-200'}
                                                    ${isPast ? '!bg-gray-100 opacity-75 grayscale-[0.5]' : ''}
                                                    ${isExpanded ? 'ring-2 ring-red-300 border-red-400 font-medium' : ''}
                                                `}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-md ${isBooked ? 'bg-red-100 text-red-600' : isEffectivelyBlocked ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-600'} ${isPast ? '!bg-gray-200 !text-gray-400' : ''}`}>
                                                        <Clock size={16} />
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-semibold ${isPast ? 'text-gray-500' : 'text-gray-800'}`}>{time}</span>
                                                        <p className="text-xs text-gray-400 uppercase font-bold">
                                                            {isBooked ? (slotStatus.summary || 'Booked Slot') : isEffectivelyBlocked ? 'Office Off' : 'Available'}
                                                            {isPast && ' (Past)'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isBooked ? (
                                                        <div className="flex items-center gap-1.5">
                                                        <div className="flex items-center gap-1.5 text-red-600 bg-red-100/50 px-2 py-1 rounded-md text-[11px] font-bold uppercase border border-red-200">
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {isExpanded ? 'Hide' : 'View Details'}
                                                        </div>
                                                              <button 
                                                                type="button"
                                                                disabled={actionLoading || isPast}
                                                                onClick={(e) => { e.stopPropagation(); handleCancelDemo(slotStatus.eventId, time); }}
                                                                className={`p-1.5 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-all shadow-sm flex items-center justify-center min-w-[30px] ${isPast ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                title={isPast ? "Cannot cancel past demo" : "Cancel Demo"}
                                                            >
                                                                {actionLoading && expandedSlot === time ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
                                                            <button 
                                                                type="button"
                                                                disabled={actionLoading || isPast || !isEffectivelyBlocked}
                                                                onClick={(e) => { e.stopPropagation(); handleToggleSlot(dateStr, time, true); }}
                                                                className={`px-2 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1
                                                                    ${isPast ? 'cursor-not-allowed opacity-50' : ''}
                                                                    ${!isEffectivelyBlocked 
                                                                        ? 'bg-green-600 text-white shadow-sm' 
                                                                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}
                                                                `}
                                                            >
                                                                {loadingSlots[`${dateStr}-${time}`] ? <Loader size={10} className="animate-spin" /> : <CheckCircle size={10} />} Available
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                disabled={actionLoading || isPast || isEffectivelyBlocked}
                                                                onClick={(e) => { e.stopPropagation(); handleToggleSlot(dateStr, time, false); }}
                                                                className={`px-2 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-1
                                                                    ${isPast ? 'cursor-not-allowed opacity-50' : ''}
                                                                    ${isEffectivelyBlocked 
                                                                        ? 'bg-red-600 text-white shadow-sm' 
                                                                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}
                                                                `}
                                                            >
                                                                {loadingSlots[`${dateStr}-${time}`] ? <Loader size={10} className="animate-spin" /> : <XCircle size={10} />} Unavailable
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isBooked && isExpanded && (
                                                <div className="overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                                    <div className="bg-white border-x border-b border-red-200 p-3 rounded-b-lg shadow-inner-lg">
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-400 uppercase font-semibold">Customer</span>
                                                                <span className="text-gray-800 font-medium">{customerName}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-400 uppercase font-semibold">Business</span>
                                                                <span className="text-red-700 font-medium">{businessName}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-400 uppercase font-semibold">Email</span>
                                                                <span className="text-gray-600 truncate">{contactEmail}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-400 uppercase font-semibold">Phone</span>
                                                                <span className="text-gray-600">{phoneNumber}</span>
                                                            </div>
                                                            <div className="flex flex-col col-span-2 pt-1 border-t border-gray-50">
                                                                <span className="text-xs text-gray-400 uppercase font-semibold">Enquiry</span>
                                                                <span className="text-gray-600">{enquiryType}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                        </div>
                        );
                    })() : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-10 text-center text-gray-400">
                            <div className="p-6 bg-gray-50 rounded-full mb-6">
                                <Calendar size={64} strokeWidth={1} className="text-gray-300" />
                            </div>
                            <h5 className="text-gray-800 font-extrabold text-lg mb-2">Select a Date</h5>
                            <p className="text-sm max-w-[250px] mx-auto">Click on any date to manage its specific 1-hour slots.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

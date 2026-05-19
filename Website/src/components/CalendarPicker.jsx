import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import './CalendarPicker.css'

export default function CalendarPicker({ isOpen, onClose, onDateTimeSelect, bookedSlots }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showTimeSlots, setShowTimeSlots] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowTimeSlots(false)
      setSelectedDate(null)
    }
  }, [isOpen])

  // Format date to YYYY-MM-DD for backend consistency without TZ offset issues
  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Format date to DD/MM/YYYY for display
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Format time to 12-hour with AM/PM
  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHours = h % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Generate available time slots (10 AM to 6 PM, 1-hour slots)
  const AVAILABLE_TIMES = [
    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ]

  // Get specific day status
  const getDayStatus = (date) => {
    const dateStr = formatDateToYYYYMMDD(date)
    const daySlots = bookedSlots.filter(slot => slot.date === dateStr)
    
    // Check for holiday (Sunday)
    if (daySlots.some(slot => slot.type === 'holiday' || slot.time === 'FULL_DAY')) return 'off';

    const bookedTimesForDate = daySlots.map(slot => slot.time)
    
    // For today, we also need to consider already-passed hours
    const isToday = date.toDateString() === new Date().toDateString();
    let effectiveAvailableTimes = [...AVAILABLE_TIMES];
    
    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      effectiveAvailableTimes = AVAILABLE_TIMES.filter(time => parseInt(time.split(':')[0], 10) > currentHour);
      
      // If no future slots are left today, mark as FULL
      if (effectiveAvailableTimes.length === 0) return 'full';
    }

    // Date is fully booked if ALL effective office hours are in the booked list
    if (effectiveAvailableTimes.length > 0 && effectiveAvailableTimes.every(time => bookedTimesForDate.includes(time))) return 'full';
    
    return null;
  }

  // Helper for backward compatibility or simple checks
  const isDateUnavailable = (date) => !!getDayStatus(date);

  // Get booked times for a specific date
  const getBookedTimesForDate = (date) => {
    const dateStr = formatDateToYYYYMMDD(date)
    const dayStatus = getDayStatus(date)
    
    if (dayStatus === 'off') return AVAILABLE_TIMES;

    const daySlots = bookedSlots.filter(slot => slot.date === dateStr)
    return daySlots.map(slot => slot.time)
  }

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  // Get first day of month
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i))
    }

    return days
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDateClick = (date) => {
    if (date && !isDateUnavailable(date)) {
      // Allow today or future
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (date >= today) {
        setSelectedDate(date)
        setShowTimeSlots(true)
      }
    }
  }

  const handleTimeClick = (time) => {
    const dateStr = formatDateToYYYYMMDD(selectedDate)
    onDateTimeSelect(dateStr, time)
    onClose()
  }

  const handleBackToCalendar = () => {
    setShowTimeSlots(false)
    setSelectedDate(null)
  }

  if (!isOpen) return null

  const calendarDays = generateCalendarDays()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
  
  // Get tomorrow's date for comparison
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + 1)

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <button className="cp-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {!showTimeSlots ? (
          // Calendar View
          <div className="cp-calendar">
            <h3 className="cp-modal-title">Select Demo Date</h3>
            
            <div className="cp-header">
              <button onClick={handlePrevMonth} className="cp-nav-btn">
                <ChevronLeft size={20} />
              </button>
              <h3 className="cp-month">{monthName}</h3>
              <button onClick={handleNextMonth} className="cp-nav-btn">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="cp-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="cp-weekday">{day}</div>
              ))}
            </div>

            <div className="cp-days">
              {calendarDays.map((date, idx) => {
                const status = date ? getDayStatus(date) : null;
                const isFullyBooked = status === 'full';
                const isOff = status === 'off';
                
                // Check if date is in past (before today)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const isPast = date && date < today
                
                const isClickable = date && !isFullyBooked && !isOff && !isPast

                return (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(date)}
                    className={`cp-day ${isFullyBooked ? 'cp-booked' : ''} ${isOff ? 'cp-off' : ''} ${isPast ? 'cp-past' : ''} ${isClickable ? 'cp-available' : 'cp-disabled'}`}
                    disabled={!isClickable}
                  >
                    {date ? date.getDate() : ''}
                    {isFullyBooked && <span className="cp-booked-badge">Full</span>}
                  </button>
                )
              })}
            </div>

            <div className="cp-legend">
              <div className="cp-legend-item">
                <div className="cp-legend-color cp-available"></div>
                <span>Available</span>
              </div>
              <div className="cp-legend-item">
                <div className="cp-legend-color cp-booked-color"></div>
                <span>Fully Booked</span>
              </div>
            </div>
          </div>
        ) : (
          // Time Slots View
          <div className="cp-times">
            <button className="cp-back-btn" onClick={handleBackToCalendar}>
              ← Back to Calendar
            </button>
            
            <h3 className="cp-modal-title">Available Times for {formatDateForDisplay(selectedDate)}</h3>
            
            <div className="cp-time-grid">
              {AVAILABLE_TIMES.map(time => {
                const isBooked = getBookedTimesForDate(selectedDate).includes(time)
                
                // For today, check if the hour has already passed
                const isToday = selectedDate.toDateString() === new Date().toDateString();
                const now = new Date();
                const slotHour = parseInt(time.split(':')[0], 10);
                const isPastSlot = isToday && slotHour <= now.getHours();

                // Don't show booked slots or past slots
                if (isBooked || isPastSlot) return null;

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeClick(time)}
                    className="cp-time-slot cp-time-available"
                  >
                    {formatTimeTo12Hour(time)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DayPicker, SelectRangeEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar as CalendarIcon, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onClear: () => void;
  placeholder?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  placeholder = '日付を選択',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleDayClick: SelectRangeEventHandler = (range) => {
    onStartDateChange(range?.from || null);
    onEndDateChange(range?.to || null);
  };

  const selectedRange = {
    from: startDate || undefined,
    to: endDate || undefined,
  };

  const displayValue = startDate && endDate
    ? `${format(startDate, 'yyyy/MM/dd', { locale: ja })} - ${format(endDate, 'yyyy/MM/dd', { locale: ja })}`
    : '';

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className={displayValue ? 'text-gray-900' : 'text-gray-500'}>
          {displayValue || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-500 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleDayClick}
            locale={ja}
            showOutsideDays
            modifiersStyles={{
              selected: {
                backgroundColor: '#3b82f6', // blue-500
                color: 'white',
              },
              range_middle: {
                backgroundColor: '#bfdbfe', // blue-200
              },
            }}
            styles={{
              caption: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#1f2937', // gray-900
              },
              nav: {
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              },
              nav_button: {
                color: '#4b5563', // gray-600
                borderRadius: '0.5rem',
                padding: '0.5rem',
                transition: 'background-color 0.2s',
              },
              nav_button_previous: {
                marginRight: 'auto',
              },
              nav_button_next: {
                marginLeft: 'auto',
              },
              head_cell: {
                color: '#6b7280', // gray-500
                fontSize: '0.875rem',
                fontWeight: 'normal',
                padding: '0.5rem',
              },
              cell: {
                padding: '0.25rem',
              },
              day: {
                borderRadius: '0.5rem',
                transition: 'background-color 0.2s',
                fontSize: '0.875rem',
                padding: '0.5rem',
              },
              day_selected: {
                backgroundColor: '#3b82f6',
                color: 'white',
              },
              day_range_middle: {
                backgroundColor: '#bfdbfe',
              },
              day_today: {
                fontWeight: 'bold',
                color: '#3b82f6',
              },
              day_outside: {
                color: '#9ca3af', // gray-400
              },
              day_disabled: {
                color: '#d1d5db', // gray-300
              },
            } as any}
          />
          {(startDate || endDate) && (
            <div className="flex justify-end mt-2">
              <button
                onClick={onClear}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                クリア
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

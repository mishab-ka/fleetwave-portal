import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

interface WeeklyCalendarProps {
  onDateSelect: (date: string) => void;
  requireSelection?: boolean; // optional prop from parent
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  onDateSelect,
  requireSelection = false,
}) => {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const today = dayjs();
    const week = Array.from({ length: 7 }, (_, index) =>
      today.subtract(6 - index, "day").format("YYYY-MM-DD")
    );
    setDates(week);
  }, []);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowError(false); // Hide error on select
    onDateSelect(date);
  };

  const validateSelection = () => {
    if (!selectedDate && requireSelection) {
      setShowError(true);
    }
  };

  // Run validation on mount if required
  useEffect(() => {
    validateSelection();
  }, [requireSelection]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 mb-1 bg-white rounded">
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            className={`p-1 rounded w-full text-center  bg-gray-100 cursor-pointer ${
              selectedDate === date
                ? "bg-green-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => handleDateClick(date)}
          >
            {dayjs(date).format("ddd D")}
          </button>
        ))}
      </div>

      {showError && (
        <p className="text-red-500 text-xs px-1">Please select a date</p>
      )}
    </div>
  );
};

export default WeeklyCalendar;

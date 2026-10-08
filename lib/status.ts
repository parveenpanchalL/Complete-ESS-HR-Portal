export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
  WEEKLY_OFF: "Weekly Off",
  HALF_DAY: "Half Day",
  LATE: "Late",
  MISSING_PUNCH: "Missing Punch",
};

export const ATTENDANCE_STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-green-50 text-green-700 border-green-200",
  ABSENT: "bg-red-50 text-red-700 border-red-200",
  LEAVE: "bg-yellow-50 text-yellow-700 border-yellow-200",
  HOLIDAY: "bg-gray-100 text-gray-600 border-gray-300",
  WEEKLY_OFF: "bg-gray-50 text-gray-500 border-gray-200",
  HALF_DAY: "bg-orange-50 text-orange-700 border-orange-200",
  LATE: "bg-amber-50 text-amber-700 border-amber-200",
  MISSING_PUNCH: "bg-rose-50 text-rose-700 border-rose-200",
};

export const ATTENDANCE_DOT_COLOR: Record<string, string> = {
  PRESENT: "bg-green-500",
  ABSENT: "bg-red-500",
  LEAVE: "bg-yellow-500",
  HOLIDAY: "bg-gray-400",
  WEEKLY_OFF: "bg-gray-300",
  HALF_DAY: "bg-orange-500",
  LATE: "bg-amber-500",
  MISSING_PUNCH: "bg-rose-500",
};

export const REQUEST_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-300",
};

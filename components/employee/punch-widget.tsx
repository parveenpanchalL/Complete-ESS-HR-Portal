"use client";

import { useState, useTransition, useEffect } from "react";
import { punchInAction, punchOutAction } from "@/lib/actions/employee";
import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_STATUS_COLOR, ATTENDANCE_STATUS_LABEL } from "@/lib/status";

type TodayRecord = {
  in_time: string | null;
  out_time: string | null;
  working_hours: number | null;
  status: string;
} | null | undefined;

export function PunchWidget({ today, todayDate }: { today: TodayRecord; todayDate: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [liveTime, setLiveTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePunchIn = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await punchInAction();
      if (res?.error) setMessage({ error: res.error });
      else if (res?.success) setMessage({ success: res.success });
    });
  };

  const handlePunchOut = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await punchOutAction();
      if (res?.error) setMessage({ error: res.error });
      else if (res?.success) setMessage({ success: res.success });
    });
  };

  const hasIn = Boolean(today?.in_time);
  const hasOut = Boolean(today?.out_time);

  return (
    <div className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today&apos;s Attendance</span>
          <p className="text-sm font-semibold text-gray-900">{todayDate}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400">Current Time</span>
          <p className="text-sm font-mono font-medium text-gray-700">{liveTime || "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          {today ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                In: <span className="font-mono">{today.in_time || "—"}</span>
                {" | "}
                Out: <span className="font-mono">{today.out_time || "—"}</span>
              </span>
              {today.status && (
                <Badge className={ATTENDANCE_STATUS_COLOR[today.status] || "bg-gray-100 text-gray-800"}>
                  {ATTENDANCE_STATUS_LABEL[today.status] || today.status}
                </Badge>
              )}
              {today.working_hours !== null && today.working_hours !== undefined && (
                <span className="text-xs text-gray-500">({today.working_hours} hrs)</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No attendance record for today yet.</p>
          )}

          <p className="text-xs text-gray-500">
            {!hasIn
              ? "Punch in when you start your workday."
              : !hasOut
              ? "You are currently checked in. Don't forget to punch out when leaving."
              : "You have completed your attendance for today."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasIn && (
            <button
              onClick={handlePunchIn}
              disabled={isPending}
              className="bg-gray-900 text-white text-sm font-medium rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Recording..." : "Punch In"}
            </button>
          )}

          {hasIn && !hasOut && (
            <button
              onClick={handlePunchOut}
              disabled={isPending}
              className="bg-gray-900 text-white text-sm font-medium rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-60 transition-colors"
            >
              {isPending ? "Recording..." : "Punch Out"}
            </button>
          )}

          {hasIn && hasOut && (
            <span className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              ✓ Day Completed
            </span>
          )}
        </div>
      </div>

      {message?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {message.error}
        </p>
      )}
      {message?.success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {message.success}
        </p>
      )}
    </div>
  );
}

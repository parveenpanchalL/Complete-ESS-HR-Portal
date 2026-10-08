"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestCorrectionAction, applyLeaveAction } from "@/lib/actions/employee";

const input = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900";
const label = "block text-xs font-medium text-gray-600 mb-1";

function Submit({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="bg-gray-900 text-white text-sm rounded px-4 py-1.5 hover:bg-gray-800 disabled:opacity-60">
      {pending ? "Submitting..." : text}
    </button>
  );
}

function Msg({ s }: { s: { error?: string; success?: string } | null }) {
  if (!s) return null;
  return s.error ? <p className="text-xs text-red-600">{s.error}</p> : <p className="text-xs text-green-700">{s.success}</p>;
}

export function CorrectionForm() {
  const [state, action] = useFormState(requestCorrectionAction, null);
  return (
    <form action={action} encType="multipart/form-data" className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">Request Attendance Correction</p>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={label}>Date</label><input type="date" name="date" required className={input} /></div>
        <div><label className={label}>In Time</label><input type="time" name="inTime" required className={input} /></div>
        <div><label className={label}>Out Time</label><input type="time" name="outTime" required className={input} /></div>
      </div>
      <div><label className={label}>Reason</label><textarea name="reason" required rows={2} className={input} /></div>
      <div>
        <label className={label}>Supporting Attachment (Optional — PDF, PNG, JPG up to 2MB)</label>
        <input type="file" name="attachment" accept=".pdf,.png,.jpg,.jpeg" className="text-xs text-gray-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-gray-100 hover:file:bg-gray-200" />
      </div>
      <Msg s={state} />
      <Submit text="Submit Request" />
    </form>
  );
}

export function LeaveForm({ types }: { types: { id: string; label: string }[] }) {
  const [state, action] = useFormState(applyLeaveAction, null);
  return (
    <form action={action} encType="multipart/form-data" className="border border-gray-200 rounded-md bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">Apply for Leave</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><label className={label}>Leave Type</label>
          <select name="leaveTypeId" required className={input}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select></div>
        <div><label className={label}>From</label><input type="date" name="fromDate" required className={input} /></div>
        <div><label className={label}>To</label><input type="date" name="toDate" required className={input} /></div>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" name="halfDay" /> Half day (single-date requests only)
      </label>
      <div><label className={label}>Reason</label><textarea name="reason" required rows={2} className={input} /></div>
      <div>
        <label className={label}>Supporting Document (Optional — Medical Certificate / Slip up to 2MB)</label>
        <input type="file" name="attachment" accept=".pdf,.png,.jpg,.jpeg" className="text-xs text-gray-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-gray-100 hover:file:bg-gray-200" />
      </div>
      <Msg s={state} />
      <Submit text="Submit Leave Request" />
    </form>
  );
}

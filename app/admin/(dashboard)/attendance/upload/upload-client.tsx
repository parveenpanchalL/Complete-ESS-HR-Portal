"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ValidatedRow = {
  rowNumber: number;
  employeeId: string;
  date: string;
  rawDate: string;
  inTime: string;
  outTime: string;
  status: string;
  employeeDbId?: string;
  workingHours?: number | null;
  errors: string[];
};

type Summary = {
  totalRecords: number;
  matchedEmployees: number;
  unknownEmployeeIds: number;
  duplicateRecords: number;
  invalidDates: number;
  invalidStatus: number;
  invalidTimeFormat: number;
  validRecords: number;
  errorRecords: number;
};

export function AttendanceUploadClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; total: number; protectedCount?: number } | null>(
    null
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/attendance/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to parse file.");
        setSummary(null);
        setRows([]);
      } else {
        setSummary(data.summary);
        setRows(data.rows);
      }
    } catch (err) {
      setError("Something went wrong while reading the file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!fileName) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed.");
      } else {
        setResult(data);
        router.refresh();
      }
    } catch {
      setError("Something went wrong while importing.");
    } finally {
      setImporting(false);
    }
  }

  function handleCancel() {
    setFileName(null);
    setSummary(null);
    setRows([]);
    setResult(null);
    setError(null);
  }

  function downloadErrorReport() {
    const errorRows = rows.filter((r) => r.errors.length > 0);
    const header = "Row,Employee ID,Date,In Time,Out Time,Status,Errors\n";
    const body = errorRows
      .map(
        (r) =>
          `${r.rowNumber},${r.employeeId},${r.rawDate},${r.inTime},${r.outTime},${r.status},"${r.errors.join("; ")}"`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const displayedRows = showOnlyErrors ? rows.filter((r) => r.errors.length > 0) : rows;

  return (
    <div className="space-y-5">
      {!summary && !result && (
        <div className="border border-dashed border-gray-300 rounded-md p-8 text-center bg-white">
          <p className="text-sm text-gray-600 mb-3">
            Upload an Excel (.xlsx) or CSV file exported from the biometric attendance system.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Expected columns: Employee ID, Date, In Time, Out Time, Status
          </p>
          <label className="inline-block bg-gray-900 text-white text-sm rounded px-4 py-2 cursor-pointer hover:bg-gray-800">
            {loading ? "Reading file..." : "Choose File"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
          {error}
        </p>
      )}

      {summary && !result && (
        <>
          <div className="border border-gray-200 rounded-md bg-white p-4">
            <p className="text-sm font-medium text-gray-900 mb-3">{fileName}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Total Records</p>
                <p className="text-lg font-semibold text-gray-900">{summary.totalRecords}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Matched Employees</p>
                <p className="text-lg font-semibold text-gray-900">{summary.matchedEmployees}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Valid Records</p>
                <p className="text-lg font-semibold text-green-700">{summary.validRecords}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Error Records</p>
                <p className="text-lg font-semibold text-red-700">{summary.errorRecords}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Unknown Employee IDs</p>
                <p className="text-lg font-semibold text-gray-900">{summary.unknownEmployeeIds}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Duplicate Records</p>
                <p className="text-lg font-semibold text-gray-900">{summary.duplicateRecords}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Invalid Dates</p>
                <p className="text-lg font-semibold text-gray-900">{summary.invalidDates}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">Invalid Status</p>
                <p className="text-lg font-semibold text-gray-900">{summary.invalidStatus}</p>
              </div>
            </div>

            {summary.errorRecords > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
                {summary.errorRecords} record(s) have errors and will be skipped. Only the{" "}
                {summary.validRecords} valid record(s) will be imported.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
              />
              Show only rows with errors
            </label>
            {summary.errorRecords > 0 && (
              <button
                onClick={downloadErrorReport}
                className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
              >
                Download Error Report
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-md bg-white overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Employee ID</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">In</th>
                  <th className="px-2 py-2">Out</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.slice(0, 500).map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={`border-b border-gray-100 last:border-0 ${
                      r.errors.length > 0 ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="px-2 py-1.5 text-gray-500">{r.rowNumber}</td>
                    <td className="px-2 py-1.5">{r.employeeId || "—"}</td>
                    <td className="px-2 py-1.5">{r.date || r.rawDate || "—"}</td>
                    <td className="px-2 py-1.5">{r.inTime || "—"}</td>
                    <td className="px-2 py-1.5">{r.outTime || "—"}</td>
                    <td className="px-2 py-1.5">{r.status || "—"}</td>
                    <td className="px-2 py-1.5 text-red-600">{r.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="text-sm border border-gray-300 rounded px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importing || summary.validRecords === 0}
              className="text-sm bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {importing ? "Importing..." : `Confirm Import (${summary.validRecords} records)`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="border border-green-200 bg-green-50 rounded-md p-4">
          <p className="text-sm font-medium text-green-800 mb-1">Import complete</p>
          <p className="text-xs text-green-700">
            {result.success} of {result.total} records imported successfully.
            {result.failed > 0 && ` ${result.failed} record(s) were skipped due to errors.`}
            {!!result.protectedCount && ` ${result.protectedCount} record(s) were left unchanged because they were set by an approved correction or leave.`}
          </p>
          <button
            onClick={handleCancel}
            className="mt-3 text-xs border border-green-300 rounded px-3 py-1.5 hover:bg-green-100"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}

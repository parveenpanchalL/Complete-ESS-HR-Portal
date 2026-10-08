import { AttendanceUploadClient } from "./upload-client";

export default function AttendanceUploadPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Upload Attendance</h1>
        <p className="text-xs text-gray-500">
          Upload → Preview → Validate → Confirm Import
        </p>
      </div>
      <AttendanceUploadClient />
    </div>
  );
}

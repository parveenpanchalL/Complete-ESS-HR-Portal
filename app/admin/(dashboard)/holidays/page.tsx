import { q } from "@/lib/db";
import { addHolidayAction, deleteHolidayAction } from "@/lib/actions/hr";

export default async function HolidaysPage() {
  const rows = await q<{ id: string; name: string; date: string; type: string; location: string | null }>(`SELECT * FROM holidays ORDER BY date`);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Holiday Calendar</h1>
        <p className="text-xs text-gray-500">Manage company holidays</p>
      </div>

      <form action={addHolidayAction} className="border border-gray-200 rounded-md bg-white p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Holiday Name</label>
          <input name="name" required className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input name="date" type="date" required className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select name="type" className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="National">National</option>
            <option value="Regional">Regional</option>
            <option value="Optional">Optional</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Location (optional)</label>
          <input name="location" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </div>
        <button className="bg-gray-900 text-white text-sm rounded px-4 py-1.5 hover:bg-gray-800">
          Add Holiday
        </button>
      </form>

      <div className="border border-gray-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-900">{h.name}</td>
                <td className="px-3 py-2 text-gray-600">{h.date}</td>
                <td className="px-3 py-2 text-gray-600">{h.type}</td>
                <td className="px-3 py-2 text-gray-600">{h.location || "All"}</td>
                <td className="px-3 py-2">
                  <form action={deleteHolidayAction.bind(null, h.id)}>
                    <button className="text-xs text-red-600 hover:text-red-800 underline">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-sm">
                  No holidays added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

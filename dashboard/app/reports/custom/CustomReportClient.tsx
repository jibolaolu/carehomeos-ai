"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const AVAILABLE_FIELDS = [
  { category: "Resident", fields: ["Name", "Room", "Admission Date", "Status", "Falls Risk", "Deterioration Risk"] },
  { category: "Care Notes", fields: ["Note Type", "Content", "Recorded By", "Recorded At", "AI Generated"] },
  { category: "Incidents", fields: ["Type", "Severity", "Status", "Date", "Resident"] },
  { category: "Staff", fields: ["Name", "Role", "Department", "Start Date", "Training Status"] },
  { category: "eMAR", fields: ["Medication", "Status", "Scheduled Time", "Administered By"] },
];

export default function CustomReportClient() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Custom Report Builder</h1>
      <p className="text-gray-500 mb-6">Build your own reports by selecting fields and filters</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Available Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {AVAILABLE_FIELDS.map((group) => (
                  <div key={group.category}>
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">{group.category}</h3>
                    <div className="space-y-1">
                      {group.fields.map((field) => (
                        <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field)}
                            onChange={() => toggleField(field)}
                            className="rounded"
                          />
                          {field}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFields.length === 0 ? (
                <p className="text-gray-500 text-center py-12">Select fields to preview report</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {selectedFields.map((field) => (
                          <th key={field} className="text-left py-2 px-3 font-medium">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {selectedFields.map((field) => (
                            <td key={field} className="py-2 px-3 text-gray-600">
                              Sample {field} {i + 1}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Export CSV
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Export Excel
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
              Export PDF
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 ml-auto">
              Save Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

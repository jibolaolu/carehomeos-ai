"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function CQCPIRClient() {
  const [home, setHome] = useState("");

  const sections = [
    { id: "provider", title: "Provider Information", completed: true },
    { id: "locations", title: "Location Details", completed: true },
    { id: "people", title: "People We Support", completed: false },
    { id: "staff", title: "Staffing", completed: false },
    { id: "quality", title: "Quality & Safety", completed: false },
    { id: "finance", title: "Financial Information", completed: false },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">CQC Provider Information Return (PIR)</h1>
        <p className="text-gray-500">Pre-populated from CareHomeOS data</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Care Home</label>
        <select
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full max-w-md"
        >
          <option value="">Select a home...</option>
          <option value="oakfield">Oakfield House</option>
          <option value="rose">Rose Cottage</option>
          <option value="willow">Willow Lodge</option>
        </select>
      </div>

      <div className="grid gap-4 mb-8">
        {sections.map((section) => (
          <Card key={section.id} className={section.completed ? "border-green-200" : ""}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                    section.completed ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  {section.completed ? "✓" : "○"}
                </div>
                <span className="font-medium">{section.title}</span>
              </div>
              <button className="text-blue-600 text-sm hover:underline">
                {section.completed ? "Review" : "Complete"}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Export to PDF
        </button>
        <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200">
          Save Draft
        </button>
      </div>
    </div>
  );
}

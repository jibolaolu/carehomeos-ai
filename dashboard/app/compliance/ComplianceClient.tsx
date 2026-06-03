"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const COMPLIANCE_AREAS = [
  {
    id: "iso27001",
    name: "ISO 27001",
    status: "in_progress",
    progress: 65,
    description: "Information Security Management System",
    next_action: "Complete risk register",
    target_date: "Q4 2026",
  },
  {
    id: "cyber_essentials",
    name: "Cyber Essentials Plus",
    status: "in_progress",
    progress: 80,
    description: "UK government cybersecurity standard",
    next_action: "Submit self-assessment",
    target_date: "Q3 2026",
  },
  {
    id: "dspt",
    name: "DSPT",
    status: "in_progress",
    progress: 70,
    description: "Data Security and Protection Toolkit",
    next_action: "Complete evidence pack",
    target_date: "Annual",
  },
  {
    id: "dcb0129",
    name: "DCB0129",
    status: "in_progress",
    progress: 60,
    description: "Clinical Risk Management for Health IT",
    next_action: "Clinical safety officer review",
    target_date: "Q4 2026",
  },
  {
    id: "g_cloud",
    name: "G-Cloud 14",
    status: "pending",
    progress: 30,
    description: "Crown Commercial Service framework",
    next_action: "Submit service description",
    target_date: "Q3 2026",
  },
  {
    id: "nhs_gp_connect",
    name: "NHS GP Connect",
    status: "pending",
    progress: 15,
    description: "GP system integration pathway",
    next_action: "DSP Toolkit registration",
    target_date: "Q2 2027",
  },
];

export default function ComplianceClient() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Compliance Centre</h1>
        <p className="text-gray-500">Track certification status and NHS integration readiness</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {COMPLIANCE_AREAS.map((area) => (
          <Card key={area.id} className={area.status === "complete" ? "border-green-200" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{area.name}</CardTitle>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    area.status === "complete"
                      ? "bg-green-100 text-green-700"
                      : area.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {area.status === "complete" ? "Complete" : area.status === "in_progress" ? "In Progress" : "Pending"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">{area.description}</p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${
                    area.progress >= 80 ? "bg-green-500" : area.progress >= 50 ? "bg-blue-500" : "bg-yellow-500"
                  }`}
                  style={{ width: `${area.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{area.progress}% complete</span>
                <span>Target: {area.target_date}</span>
              </div>
              <div className="mt-3 text-sm">
                <span className="font-medium">Next:</span> {area.next_action}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NHS Integration Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { item: "DSP Toolkit registered", done: false },
              { item: "DCB0129 clinical safety case approved", done: false },
              { item: "FHIR R4 mapping complete", done: true },
              { item: "GP Connect conformance test passed", done: false },
              { item: "NHS Digital supplier agreement signed", done: false },
              { item: "Production credentials obtained", done: false },
            ].map((check) => (
              <div key={check.item} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                    check.done ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  {check.done ? "✓" : "○"}
                </div>
                <span className={check.done ? "text-gray-700" : "text-gray-500"}>{check.item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

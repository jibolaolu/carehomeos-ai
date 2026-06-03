"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { getOnboardingProgress, updateOnboardingProgress, type OnboardingChecklist } from "../../lib/api-client";

const STEP_KEYS: Array<{ id: number; key: keyof OnboardingChecklist; title: string; description: string }> = [
  { id: 1, key: "home_details_configured", title: "Home Details", description: "Configure your care home information" },
  { id: 2, key: "residents_imported", title: "Import Residents", description: "Add residents via CSV or manual entry" },
  { id: 3, key: "staff_setup_complete", title: "Staff Setup", description: "Add staff members and assign roles" },
  { id: 4, key: "care_plan_templates_loaded", title: "Care Plan Templates", description: "Load standard care plan templates" },
  { id: 5, key: "mar_configured", title: "eMAR Configuration", description: "Set up medication rounds" },
  { id: 6, key: "go_live_checklist_complete", title: "Go-Live Checklist", description: "Verify everything is ready" },
];

export default function OnboardingClient() {
  const [checklist, setChecklist] = useState<OnboardingChecklist>({});
  const [phase, setPhase] = useState("not_started");
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOnboardingProgress();
      setChecklist(data.checklist ?? {});
      setPhase(data.phase ?? "not_started");
      const firstIncomplete = STEP_KEYS.find((s) => !data.checklist?.[s.key]);
      setCurrentStep(firstIncomplete?.id ?? STEP_KEYS.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load onboarding progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const completedCount = STEP_KEYS.filter((s) => checklist[s.key]).length;
  const progress = (completedCount / STEP_KEYS.length) * 100;

  const completeStep = async (key: keyof OnboardingChecklist) => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateOnboardingProgress({ [key]: true });
      setPhase(updated.phase);
      await loadProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome to CareHomeOS</h1>
        <p className="text-gray-500">
          Complete these steps to get your care home up and running
          {loading ? " (loading…)" : ` — phase: ${phase.replace(/_/g, " ")}`}
        </p>
        {error ? <p className="text-red-600 text-sm mt-2">{error}</p> : null}
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span>Setup Progress</span>
          <span>
            {completedCount} of {STEP_KEYS.length} completed
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {STEP_KEYS.map((step) => {
          const completed = Boolean(checklist[step.key]);
          const inProgress = step.id === currentStep;
          return (
            <Card
              key={step.id}
              className={`cursor-pointer transition-all ${
                completed ? "border-green-200 bg-green-50" : inProgress ? "border-blue-200 ring-1 ring-blue-200" : ""
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    completed ? "bg-green-500" : inProgress ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  {completed ? "✓" : step.id}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
                {completed && <span className="text-green-600 text-sm font-medium">Completed</span>}
                {inProgress && !completed && (
                  <span className="text-blue-600 text-sm font-medium">In Progress</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex gap-4 flex-wrap">
        <button
          type="button"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          disabled={saving || loading}
          onClick={() => {
            const step = STEP_KEYS.find((s) => s.id === currentStep);
            if (step) void completeStep(step.key);
          }}
        >
          {saving ? "Saving…" : "Mark step complete"}
        </button>
        <Link href="/dashboard" className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 inline-flex items-center">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

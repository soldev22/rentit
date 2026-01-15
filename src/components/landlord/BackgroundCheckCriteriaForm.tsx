"use client";

import { useEffect, useMemo, useState } from "react";
import type { LandlordBackgroundCheckCriteria } from "@/lib/landlordBackgroundCheckCriteria";

type Props = {
  initialCriteria: LandlordBackgroundCheckCriteria;
};

export default function BackgroundCheckCriteriaForm({ initialCriteria }: Props) {
  const [criteria, setCriteria] = useState<LandlordBackgroundCheckCriteria>(initialCriteria);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    setCriteria(initialCriteria);
  }, [initialCriteria]);

  const canSave = useMemo(() => {
    return (
      Number.isFinite(criteria.credit.minExperianScore) &&
      Number.isFinite(criteria.credit.maxCcjs)
    );
  }, [criteria]);

  async function save() {
    setMessage(null);
    setMessageType(null);

    if (!canSave) {
      setMessageType("error");
      setMessage("Please check the values before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/landlord/background-check-criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessageType("error");
        setMessage(data?.error || "Failed to save criteria");
        return;
      }

      setMessageType("success");
      setMessage("Criteria saved.");
    } catch {
      setMessageType("error");
      setMessage("Failed to save criteria");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-md p-3 text-sm ${
            messageType === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Credit checks</h2>
        <p className="mt-1 text-sm text-slate-600">
          These are the thresholds your team will use when interpreting credit checks.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Minimum Experian score
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={criteria.credit.minExperianScore}
              min={0}
              max={9999}
              placeholder="Enter minimum Experian score"
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  credit: { ...prev.credit, minExperianScore: Number(e.target.value) },
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Maximum CCJs</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={criteria.credit.maxCcjs}
              min={0}
              max={99}
              placeholder="Enter maximum CCJs"
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  credit: { ...prev.credit, maxCcjs: Number(e.target.value) },
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">References</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose which reference checks you expect before you mark an application as “Pass”.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={criteria.references.requireEmployerVerification}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  references: {
                    ...prev.references,
                    requireEmployerVerification: e.target.checked,
                  },
                }))
              }
            />
            Require employer verification
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={criteria.references.requireLandlordReference}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  references: {
                    ...prev.references,
                    requireLandlordReference: e.target.checked,
                  },
                }))
              }
            />
            Require previous landlord reference
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Affordability</h2>
        <p className="mt-1 text-sm text-slate-600">
          Optional guidance numbers for your own review process.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Minimum income multiple (e.g. 2.5)
            </label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={criteria.affordability.minIncomeMultiple ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setCriteria((prev) => ({
                  ...prev,
                  affordability: {
                    ...prev.affordability,
                    minIncomeMultiple: v === "" ? undefined : Number(v),
                  },
                }));
              }}
              placeholder="Enter minimum income multiple"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Minimum monthly income (optional)
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={criteria.affordability.minMonthlyIncome ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setCriteria((prev) => ({
                  ...prev,
                  affordability: {
                    ...prev.affordability,
                    minMonthlyIncome: v === "" ? undefined : Number(v),
                  },
                }));
              }}
              placeholder="Enter minimum monthly income"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-amber-900">Rent Guarantee Insurance guidance</h2>
        <p className="mt-1 text-sm text-amber-900/90">
          If you use rent guarantee insurance, most insurers require you to follow their underwriting
          rules (income, employment type, adverse credit, references). Approving a tenant outside
          those rules can affect claim eligibility.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={criteria.insurance.usesRentGuaranteeInsurance}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  insurance: {
                    ...prev.insurance,
                    usesRentGuaranteeInsurance: e.target.checked,
                  },
                }))
              }
            />
            I use rent guarantee insurance for this property/portfolio
          </label>

          <div>
            <label className="block text-sm font-medium text-amber-950">Insurer name (optional)</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
              value={criteria.insurance.insurerName ?? ""}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  insurance: { ...prev.insurance, insurerName: e.target.value },
                }))
              }
              placeholder="e.g. HomeLet / RentGuard / etc"
            />
          </div>

          <p className="text-xs text-amber-900/90">
            Tip: Keep these criteria aligned with your insurer’s wording. This page is guidance and
            does not replace your insurer’s policy documents.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Notes</h2>
        <p className="mt-1 text-sm text-slate-600">
          Optional internal notes (e.g. how you treat guarantors, students, self-employed).
        </p>
        <textarea
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={5}
          value={criteria.notes ?? ""}
          onChange={(e) => setCriteria((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Add internal notes (e.g. how you treat guarantors, students, self-employed)"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save criteria"}
        </button>
        <span className="text-xs text-slate-500">
          Saved criteria are used as guidance in the landlord review UI.
        </span>
      </div>
    </div>
  );
}

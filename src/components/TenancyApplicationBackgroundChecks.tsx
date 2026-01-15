"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TenancyApplication } from "@/lib/tenancy-application";
import type { LandlordBackgroundCheckCriteria } from "@/lib/landlordBackgroundCheckCriteria";
import { DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA } from "@/lib/landlordBackgroundCheckCriteria";

type ApplicationId = string | { toString(): string };
type TenancyApplicationWithId = TenancyApplication & { _id: ApplicationId };

export default function TenancyApplicationBackgroundChecks({
  application,
}: {
  application: TenancyApplicationWithId;
}) {
  const applicationId =
    typeof application._id === "string" ? application._id : application._id.toString();

  const [currentApplication, setCurrentApplication] = useState(application);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  function clearMessage() {
    setMessage(null);
    setMessageType(null);
  }

  function showError(nextMessage: string) {
    setMessage(nextMessage);
    setMessageType("error");
  }

  function showSuccess(nextMessage: string) {
    setMessage(nextMessage);
    setMessageType("success");
  }

  const [stage2Loading, setStage2Loading] = useState(false);
  const [stage2LoadingParty, setStage2LoadingParty] = useState<"primary" | "coTenant" | null>(null);
  const [showStage2Modal, setShowStage2Modal] = useState(false);
  const [stage2ModalParty, setStage2ModalParty] = useState<"primary" | "coTenant" | null>(null);

  const [creditScore, setCreditScore] = useState<string>("");
  const [ccjCount, setCcjCount] = useState<string>("0");
  const [creditReportUrl, setCreditReportUrl] = useState<string>("");
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditParty, setCreditParty] = useState<"primary" | "coTenant">("primary");

  const [criteria, setCriteria] = useState<LandlordBackgroundCheckCriteria>(
    DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA
  );
  const [criteriaLoaded, setCriteriaLoaded] = useState(false);

  const [landlordDecisionStatus, setLandlordDecisionStatus] = useState<
    "pending" | "pass" | "fail"
  >(currentApplication.stage2.landlordDecision?.status ?? "pending");
  const [landlordDecisionNotes, setLandlordDecisionNotes] = useState<string>(
    currentApplication.stage2.landlordDecision?.notes ?? ""
  );
  const [landlordDecisionSaving, setLandlordDecisionSaving] = useState(false);

  async function refreshApplication() {
    const refreshed = await fetch(`/api/tenancy-applications/${applicationId}`);
    if (!refreshed.ok) return;
    const freshData = await refreshed.json();
    const nextApp = freshData.application ?? freshData;
    setCurrentApplication(nextApp);

    setLandlordDecisionStatus(nextApp.stage2?.landlordDecision?.status ?? "pending");
    setLandlordDecisionNotes(nextApp.stage2?.landlordDecision?.notes ?? "");
  }


  useEffect(() => {
    let cancelled = false;

    async function loadCriteria() {
      try {
        const res = await fetch("/api/landlord/background-check-criteria", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        if (cancelled) return;
        if (data?.criteria) {
          setCriteria(data.criteria);
          setCriteriaLoaded(true);
        }
      } catch {
        // Fall back to defaults.
      }
    }

    loadCriteria();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveLandlordDecision(nextStatus: "pending" | "pass" | "fail") {
    clearMessage();

    if (nextStatus === "fail") {
      const ok = window.confirm(
        "Mark this application as CAN'T PROCEED? This will stop the application from progressing."
      );
      if (!ok) return;
    }

    setLandlordDecisionSaving(true);
    try {
      const res = await fetch(
        `/api/tenancy-applications/${applicationId}/landlord-decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            notes: landlordDecisionNotes || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showError(data?.error || "Failed to save landlord decision");
        return;
      }

      setLandlordDecisionStatus(nextStatus);
      showSuccess(
        nextStatus === "pass"
          ? "Landlord decision saved: PASS"
          : nextStatus === "fail"
            ? "Landlord decision saved: CAN'T PROCEED"
            : "Landlord decision reset to PENDING"
      );
      await refreshApplication();
    } catch {
      showError("Failed to save landlord decision");
    } finally {
      setLandlordDecisionSaving(false);
    }
  }

  async function handleStage2Action(party: "primary" | "coTenant") {
    clearMessage();
    setStage2Loading(true);
    setStage2LoadingParty(party);
    try {
      const response = await fetch(
        `/api/tenancy-applications/${applicationId}/background-check-request?party=${encodeURIComponent(
          party
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        showError(data?.error || "Failed to send background check request");
        return;
      }

      setStage2ModalParty(party);
      setShowStage2Modal(true);
      const who = party === "coTenant" ? "Co-tenant" : "Primary";
      showSuccess(`${who} background check request sent successfully.`);
      await refreshApplication();
    } catch {
      showError("An error occurred while sending the request.");
    } finally {
      setStage2Loading(false);
      setStage2LoadingParty(null);
    }
  }

  async function handleSendEmployerVerification(party: "primary" | "coTenant" = "primary") {
    clearMessage();
    try {
      const res = await fetch(
        `/api/tenancy-applications/${applicationId}/employer-verification-request?party=${encodeURIComponent(
          party
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showError(data?.error || "Failed to send employer verification link");
        return;
      }
      const suffix = data?.link ? ` Link: ${data.link}` : "";
      showSuccess(`Employer verification link sent to ${data?.to || "employer"}.${suffix}`);
      await refreshApplication();
    } catch {
      showError("Failed to send employer verification link");
    }
  }

  async function handleSendLandlordReference(party: "primary" | "coTenant" = "primary") {
    clearMessage();
    try {
      const res = await fetch(
        `/api/tenancy-applications/${applicationId}/landlord-reference-request?party=${encodeURIComponent(
          party
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showError(data?.error || "Failed to send previous landlord reference link");
        return;
      }
      const suffix = data?.link ? ` Link: ${data.link}` : "";
      showSuccess(
        `Previous landlord reference link sent to ${data?.to || "previous landlord"}.${suffix}`
      );
      await refreshApplication();
    } catch {
      showError("Failed to send previous landlord reference link");
    }
  }

  async function handleSubmitCreditCheck(e: React.FormEvent) {
    e.preventDefault();
    clearMessage();

    const scoreNum = Number(creditScore);
    const ccjNum = Number(ccjCount);
    if (!Number.isFinite(scoreNum) || !Number.isFinite(ccjNum)) {
      showError("Please enter a valid Experian score and CCJ count.");
      return;
    }

    try {
      const res = await fetch(
        `/api/tenancy-applications/${applicationId}/credit-check?party=${encodeURIComponent(
          creditParty
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experianScore: scoreNum,
            ccjCount: ccjNum,
            reportUrl: creditReportUrl || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showError(data?.error || "Failed to record credit check");
        return;
      }

      const who = creditParty === "coTenant" ? "Co-tenant" : "Primary";
      if (data?.passed) {
        showSuccess(`${who} credit check recorded: PASS`);
      } else {
        showError(
          `${who} credit check recorded: criteria not met (${data?.failureReason || "criteria not met"})`
        );
      }

      setCreditModalOpen(false);
      await refreshApplication();
    } catch {
      showError("Failed to record credit check");
    }
  }

  function Stage2ConfirmationModal() {
    if (!showStage2Modal) return null;
    const who = stage2ModalParty === "coTenant" ? "the co-tenant" : "the applicant";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h3 className="text-xl font-bold mb-4 text-green-700">Request Sent!</h3>
          <p className="mb-2">The application form link has been sent to {who} via email and SMS.</p>
          <p className="mb-4 text-sm text-gray-500">Please ask them to check their inbox and spam folder.</p>
          <button
            onClick={() => {
              setShowStage2Modal(false);
              setStage2ModalParty(null);
            }}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const creditModal = creditModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">
          Record Credit Check ({creditParty === "coTenant" ? "Co-tenant" : "Primary"})
        </h2>
        <form onSubmit={handleSubmitCreditCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Experian Score</label>
            <input
              id="credit-score"
              title="Experian score"
              placeholder="e.g. 820"
              className="border rounded px-2 py-1 w-full"
              value={creditScore}
              onChange={(e) => setCreditScore(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CCJ Count</label>
            <input
              id="ccj-count"
              title="CCJ count"
              placeholder="e.g. 0"
              className="border rounded px-2 py-1 w-full"
              value={ccjCount}
              onChange={(e) => setCcjCount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Report URL (optional)</label>
            <input
              id="credit-report-url"
              title="Credit report URL"
              placeholder="https://..."
              className="border rounded px-2 py-1 w-full"
              value={creditReportUrl}
              onChange={(e) => setCreditReportUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => setCreditModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const landlordDecisionPill =
    landlordDecisionStatus === "pass"
      ? "bg-green-100 text-green-800"
      : landlordDecisionStatus === "fail"
        ? "bg-red-100 text-red-800"
        : "bg-slate-100 text-slate-800";

  const landlordDecisionText =
    landlordDecisionStatus === "pass"
      ? "PASS"
      : landlordDecisionStatus === "fail"
        ? "CAN'T PROCEED"
        : "PENDING";

  const stage2Status = currentApplication.stage2?.status ?? "pending";
  const enabled = stage2Status !== "pending";

  const stage2 = currentApplication.stage2;
  const primaryStage2 = stage2;
  const coStage2 = stage2?.coTenant;
  const hasCoTenant = Boolean(currentApplication.coTenant);

  const stage2Summary = useMemo(() => {
    const employerRequired = criteria.references.requireEmployerVerification;
    const landlordRequired = criteria.references.requireLandlordReference;

    const primaryBg = Boolean(primaryStage2?.backgroundInfo?.submittedAt);
    const primaryCredit = Boolean(
      primaryStage2?.creditCheck &&
        primaryStage2.creditCheck.status === "completed" &&
        primaryStage2.creditCheck.passed === true
    );
    const primaryEmployer = employerRequired
      ? Boolean(primaryStage2?.employerVerification?.response?.employed === true)
      : true;
    const primaryLandlord = landlordRequired
      ? Boolean(primaryStage2?.previousLandlordReference?.response?.wouldRentAgain === true)
      : true;

    const coBg = Boolean(coStage2?.backgroundInfo?.submittedAt);
    const coCredit = Boolean(
      coStage2?.creditCheck && coStage2.creditCheck.status === "completed" && coStage2.creditCheck.passed === true
    );
    const coEmployer = employerRequired
      ? Boolean(coStage2?.employerVerification?.response?.employed === true)
      : true;
    const coLandlord = landlordRequired
      ? Boolean(coStage2?.previousLandlordReference?.response?.wouldRentAgain === true)
      : true;

    return {
      primary: { primaryBg, primaryCredit, primaryEmployer, primaryLandlord },
      co: { coBg, coCredit, coEmployer, coLandlord },
    };
  }, [primaryStage2, coStage2, criteria]);

  const renderPartyPanel = (party: "primary" | "coTenant") => {
    const isPrimary = party === "primary";
    const partyLabel = isPrimary ? "Primary applicant" : "Co-tenant";
    const partyStage2 = isPrimary ? primaryStage2 : coStage2;
    const partyExists = isPrimary ? true : hasCoTenant;

    const primaryName = currentApplication.applicantName || "Primary applicant";
    const coTenantName = currentApplication.coTenant?.name || "Co-tenant";
    const signatoriesLabel = hasCoTenant
      ? `${primaryName} + ${coTenantName}`
      : `${primaryName} (no co-tenant)`;

    const credit = partyStage2?.creditCheck;
    const backgroundSubmitted = Boolean(partyStage2?.backgroundInfo?.submittedAt);

    const minScore = criteria.credit.minExperianScore;
    const maxCcjs = criteria.credit.maxCcjs;
    const recordedScore = typeof credit?.score === "number" ? credit.score : undefined;
    const recordedCcjs = typeof credit?.ccjCount === "number" ? credit.ccjCount : undefined;
    const meetsCreditCriteria =
      typeof recordedScore === "number" &&
      typeof recordedCcjs === "number" &&
      recordedScore >= minScore &&
      recordedCcjs <= maxCcjs;
    const creditPassed = Boolean(
      credit &&
        credit.status === "completed" &&
        (credit.passed === true || (credit.passed == null && meetsCreditCriteria))
    );

    const employerPassed = Boolean(partyStage2?.employerVerification?.response?.employed === true);
    const landlordRefPassed = Boolean(
      partyStage2?.previousLandlordReference?.response?.wouldRentAgain === true
    );

    const employerRequired = criteria.references.requireEmployerVerification;
    const landlordRequired = criteria.references.requireLandlordReference;
    const employerOk = employerRequired ? employerPassed : true;
    const landlordOk = landlordRequired ? landlordRefPassed : true;

    const allCriteriaPassed =
      enabled &&
      partyExists &&
      backgroundSubmitted &&
      creditPassed &&
      employerOk &&
      landlordOk;

    const submittedAt = partyStage2?.backgroundInfo?.submittedAt;
    const sentAt = partyStage2?.sentAt;

    const applicantToken = partyStage2?.token;
    const employerToken = partyStage2?.employerVerification?.token;
    const landlordToken = partyStage2?.previousLandlordReference?.token;

    const partyDisabled = !enabled || !partyExists;
    const startDisabled = partyDisabled || stage2Loading;
    const startLoading = stage2Loading && stage2LoadingParty === party;

    return (
      <div className="rounded-lg border border-blue-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-blue-900">Stage 2: Background checks — {signatoriesLabel}</div>
            <div className="text-xs text-slate-600">This panel: {partyLabel}</div>
          </div>
          <span
            className={
              !enabled
                ? "inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-800"
                : allCriteriaPassed
                  ? "inline-block px-2 py-1 rounded text-xs font-bold bg-green-600 text-white"
                  : "inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
            }
          >
            {!enabled ? "DISABLED" : allCriteriaPassed ? "PASS" : "ENABLED"}
          </span>
        </div>

        {!enabled ? (
          <div className="mt-3 text-sm text-gray-600">Stage 2 becomes available once the viewing is agreed.</div>
        ) : !partyExists ? (
          <div className="mt-3 text-sm text-gray-600">No co-tenant has been added to this application.</div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>{partyStage2?.creditCheckConsent ? "✔️" : "❌"} Credit Check Consent</div>
              <div>{partyStage2?.socialMediaConsent ? "✔️" : "❌"} Social Media Consent</div>
              <div>{partyStage2?.landlordReferenceConsent ? "✔️" : "❌"} Landlord Reference Consent</div>
              <div>{partyStage2?.employerReferenceConsent ? "✔️" : "❌"} Employer Reference Consent</div>
            </div>

            <div className="flex flex-col gap-2">
              {submittedAt ? (
                <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                  Details submitted: {(() => {
                    const d = new Date(submittedAt);
                    return !isNaN(d.getTime())
                      ? `${d.toLocaleDateString("en-GB")}, ${d.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`
                      : submittedAt;
                  })()}
                </div>
              ) : null}
              {sentAt ? (
                <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                  Background check request sent: {new Date(sentAt).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-blue-200">
              <div className="text-sm font-semibold text-blue-900">Checks (with criteria)</div>

              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    checked={backgroundSubmitted}
                    className="mt-1 h-4 w-4"
                    aria-label={`${partyLabel} background info submitted`}
                    title={`${partyLabel} background info submitted`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Background info submitted</div>
                    <div className="text-xs text-slate-600">Criteria: form submitted via link</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    checked={creditPassed}
                    className="mt-1 h-4 w-4"
                    aria-label={`${partyLabel} credit check passed`}
                    title={`${partyLabel} credit check passed`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Credit check passed</div>
                    <div className="text-xs text-slate-600">
                      Criteria: Experian score ≥ {minScore} and CCJs ≤ {maxCcjs}
                      {criteriaLoaded ? "" : " (default)"}
                    </div>
                    {credit?.score != null || credit?.ccjCount != null ? (
                      <div className="text-xs text-slate-700">
                        Recorded: score {credit?.score ?? "—"} · CCJs {credit?.ccjCount ?? "—"} · status {credit?.status ?? "—"}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    checked={employerOk}
                    className="mt-1 h-4 w-4"
                    aria-label={`${partyLabel} employer verification passed`}
                    title={`${partyLabel} employer verification passed`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Employer verification (pass)</div>
                    <div className="text-xs text-slate-600">
                      {employerRequired
                        ? "Criteria: employer confirms employed = Yes"
                        : "Not required by criteria"}
                    </div>
                    <div className="text-xs text-slate-700">
                      Status: {partyStage2?.employerVerification?.status ?? "not_started"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    checked={landlordOk}
                    className="mt-1 h-4 w-4"
                    aria-label={`${partyLabel} previous landlord reference passed`}
                    title={`${partyLabel} previous landlord reference passed`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Previous landlord reference (pass)</div>
                    <div className="text-xs text-slate-600">
                      {landlordRequired
                        ? "Criteria: would rent again = Yes"
                        : "Not required by criteria"}
                    </div>
                    <div className="text-xs text-slate-700">
                      Status: {partyStage2?.previousLandlordReference?.status ?? "not_started"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-200">
              <div className="text-xs font-semibold text-slate-800 mb-2">Actions</div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className={
                    startDisabled
                      ? "px-4 py-2 rounded-md font-bold transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "px-4 py-2 rounded-md font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-800 shadow-lg"
                  }
                  disabled={startDisabled}
                  onClick={startDisabled ? undefined : () => handleStage2Action(party)}
                  aria-label="Start Background Checks"
                >
                  {startLoading ? "Sending..." : "Start Background Checks"}
                </button>

                <button
                  type="button"
                  className={
                    partyDisabled
                      ? "px-4 py-2 rounded-md font-medium transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                  }
                  disabled={partyDisabled}
                  onClick={
                    partyDisabled
                      ? undefined
                      : () => {
                          setCreditParty(party);
                          setCreditModalOpen(true);
                        }
                  }
                >
                  Record Credit Check
                </button>
                <button
                  type="button"
                  className={
                    partyDisabled
                      ? "px-4 py-2 rounded-md font-medium transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                  }
                  disabled={partyDisabled}
                  onClick={partyDisabled ? undefined : () => handleSendEmployerVerification(party)}
                >
                  Send Employer Verification Link
                </button>
                <button
                  type="button"
                  className={
                    partyDisabled
                      ? "px-4 py-2 rounded-md font-medium transition-colors bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "px-4 py-2 rounded-md font-medium transition-colors bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                  }
                  disabled={partyDisabled}
                  onClick={partyDisabled ? undefined : () => handleSendLandlordReference(party)}
                >
                  Send Previous Landlord Reference Link
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-200">
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-800 font-semibold">Form links (testing)</summary>
                <div className="mt-2 space-y-2">
                  {applicantToken ? (
                    <div>
                      <a
                        className="text-blue-700 underline hover:text-blue-900"
                        href={`/application/complete/${applicationId}?token=${encodeURIComponent(applicantToken)}${
                          isPrimary ? "" : "&party=coTenant"
                        }`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open applicant background info form
                      </a>
                    </div>
                  ) : null}
                  {employerToken ? (
                    <div>
                      <a
                        className="text-blue-700 underline hover:text-blue-900"
                        href={`/reference/employer/${currentApplication._id}?token=${encodeURIComponent(
                          employerToken
                        )}${isPrimary ? "" : "&party=coTenant"}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open employer form link
                      </a>
                    </div>
                  ) : null}
                  {landlordToken ? (
                    <div>
                      <a
                        className="text-blue-700 underline hover:text-blue-900"
                        href={`/reference/landlord/${currentApplication._id}?token=${encodeURIComponent(
                          landlordToken
                        )}${isPrimary ? "" : "&party=coTenant"}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open landlord reference form link
                      </a>
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`p-4 rounded-md ${
            messageType === "error"
              ? "bg-red-50 text-red-800"
              : messageType === "success"
                ? "bg-green-50 text-green-800"
                : /\b(failed|error)\b/i.test(message)
                  ? "bg-red-50 text-red-800"
                  : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      {creditModal}
      <Stage2ConfirmationModal />

      <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Stage 2: Background checks</h2>
            <p className="text-sm text-gray-600">
              Everything needed to run and record checks for both signatories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/landlord/settings/background-check-criteria"
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-medium"
            >
              Criteria settings
            </Link>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-medium"
              onClick={() => refreshApplication()}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Status: <span className="font-semibold">{stage2Status}</span>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">Landlord decision</div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${landlordDecisionPill}`}
                >
                  {landlordDecisionText}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Use your criteria (and insurer requirements) to decide PASS / CAN&apos;T PROCEED.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={landlordDecisionSaving}
                onClick={() => saveLandlordDecision("pass")}
                className="px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                Mark PASS
              </button>
              <button
                type="button"
                disabled={landlordDecisionSaving}
                onClick={() => saveLandlordDecision("fail")}
                className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                Mark CAN&apos;T PROCEED
              </button>
              <button
                type="button"
                disabled={landlordDecisionSaving}
                onClick={() => saveLandlordDecision("pending")}
                className="px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-700">
              Notes / reason (optional)
            </label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={landlordDecisionNotes}
              onChange={(e) => setLandlordDecisionNotes(e.target.value)}
              placeholder="e.g. Meets insurer criteria; income verified; references OK"
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-slate-600">
              {currentApplication.stage2.landlordDecision?.notifiedAt ? (
                <>
                  Last notified:{" "}
                  <span className="font-semibold">
                    {new Date(currentApplication.stage2.landlordDecision.notifiedAt).toLocaleString()}
                  </span>
                </>
              ) : (
                <>Not notified yet.</>
              )}
            </div>

            {landlordDecisionStatus === "pending" ? (
              <span className="px-3 py-2 rounded-md bg-slate-200 text-slate-500 text-sm font-medium cursor-not-allowed">
                Review letter & send
              </span>
            ) : (
              <Link
                href={`/landlord/applications/${applicationId}/decision-letter`}
                className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Review letter & send
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderPartyPanel("primary")}
          {renderPartyPanel("coTenant")}
        </div>

        <div className="mt-4 text-xs text-gray-600">
          Quick overview: Primary (bg {stage2Summary.primary.primaryBg ? "✔" : "✖"}, credit {stage2Summary.primary.primaryCredit ? "✔" : "✖"}, employer {stage2Summary.primary.primaryEmployer ? "✔" : "✖"}, landlord {stage2Summary.primary.primaryLandlord ? "✔" : "✖"})
          {hasCoTenant ? (
            <>
              {" "}· Co-tenant (bg {stage2Summary.co.coBg ? "✔" : "✖"}, credit {stage2Summary.co.coCredit ? "✔" : "✖"}, employer {stage2Summary.co.coEmployer ? "✔" : "✖"}, landlord {stage2Summary.co.coLandlord ? "✔" : "✖"})
            </>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <Link
              href={`/landlord/applications/${applicationId}`}
              className="text-blue-700 underline hover:text-blue-900"
            >
              Application overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

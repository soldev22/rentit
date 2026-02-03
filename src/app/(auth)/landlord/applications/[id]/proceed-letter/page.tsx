import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";

import { getTenancyApplicationById } from "@/lib/tenancy-application";
import { getCollection } from "@/lib/db";
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import { seedTenancyProceedLetter } from "@/lib/templates/tenancyProceedLetter";
import { getActiveTenancyProceedLetterTemplateText } from "@/lib/templates/getTenancyProceedLetterTemplate";
import ProceedLetterEditor from "@/components/landlord/ProceedLetterEditor";

export const dynamic = "force-dynamic";

function formatEnGbDateOnly(d: Date): string {
  return d.toLocaleDateString("en-GB");
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    // Allow whitespace inside placeholder braces, e.g. {{ DATE }}
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }

  // Also support legacy/simpler bracket placeholders used by some templates.
  if (vars.APPLICANT_NAME) out = out.replace(/\[\s*APPLICANT\s+NAME\s*\]/gi, vars.APPLICANT_NAME);
  if (vars.PROPERTY_LABEL) {
    out = out.replace(/\[\s*PROPERTY\s+ADDRESS\s*\]/gi, vars.PROPERTY_LABEL);
    out = out.replace(/\[\s*PROPERTY\s+LABEL\s*\]/gi, vars.PROPERTY_LABEL);
  }
  if (vars.DATE_TIME || vars.DATE) out = out.replace(/\[\s*DATE\s*\/\s*TIME\s*\]/gi, vars.DATE_TIME || vars.DATE);
  if (vars.APPLICATION_LINK) out = out.replace(/\[\s*APPLICATION\s+LINK\s*\]/gi, vars.APPLICATION_LINK);

  // Landlord signature/contact placeholders.
  if (vars.LANDLORD_NAME) {
    out = out.replace(/\[\s*YOUR\s+NAME\s*\]/gi, vars.LANDLORD_NAME);
    out = out.replace(/\[\s*LANDLORD\s+NAME\s*\]/gi, vars.LANDLORD_NAME);
  }
  if (vars.LANDLORD_COMPANY) {
    out = out.replace(/\[\s*COMPANY\s*\/\s*BRAND\s+NAME\s*\]/gi, vars.LANDLORD_COMPANY);
    out = out.replace(/\[\s*COMPANY\s+NAME\s*\]/gi, vars.LANDLORD_COMPANY);
    out = out.replace(/\[\s*BRAND\s+NAME\s*\]/gi, vars.LANDLORD_COMPANY);
  }
  if (vars.LANDLORD_PHONE) {
    out = out.replace(/\[\s*PHONE\s+NUMBER\s*\]/gi, vars.LANDLORD_PHONE);
    out = out.replace(/\[\s*PHONE\s*\]/gi, vars.LANDLORD_PHONE);
    out = out.replace(/\[\s*TEL\s*\]/gi, vars.LANDLORD_PHONE);
  }
  if (vars.LANDLORD_EMAIL) {
    out = out.replace(/\[\s*EMAIL\s+ADDRESS\s*\]/gi, vars.LANDLORD_EMAIL);
    out = out.replace(/\[\s*EMAIL\s*\]/gi, vars.LANDLORD_EMAIL);
  }

  return out;
}

export default async function ProceedLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  const { id } = await params;
  const application = await getTenancyApplicationById(id);
  if (!application) notFound();
  if (application.landlordId.toString() !== session.user.id) notFound();

  const properties = await getCollection("properties");
  const property = await properties.findOne(
    { _id: new ObjectId(application.propertyId) },
    { projection: { title: 1, address: 1 } }
  );

  const propertyLabel = formatPropertyLabel({
    title: typeof (property as any)?.title === "string" ? (property as any).title : undefined,
    address: (property as any)?.address,
  });

  // Landlord contact (from MongoDB users collection)
  const users = await getCollection("users");
  const landlordUser = await users.findOne({ _id: new ObjectId(application.landlordId.toString()) });

  const landlordName =
    (typeof (landlordUser as any)?.name === "string" && (landlordUser as any).name) || session.user.name || "Landlord";
  const landlordEmail = typeof (landlordUser as any)?.email === "string" ? (landlordUser as any).email : undefined;
  const landlordPhone =
    (typeof (landlordUser as any)?.profile?.phone === "string" && (landlordUser as any).profile.phone) ||
    (typeof (landlordUser as any)?.phone === "string" && (landlordUser as any).phone) ||
    (typeof (landlordUser as any)?.tel === "string" && (landlordUser as any).tel) ||
    undefined;

  const landlordCompany =
    (typeof (landlordUser as any)?.profile?.companyName === "string" && (landlordUser as any).profile.companyName) ||
    (typeof (landlordUser as any)?.profile?.brandName === "string" && (landlordUser as any).profile.brandName) ||
    (typeof (landlordUser as any)?.profile?.company === "string" && (landlordUser as any).profile.company) ||
    (typeof (landlordUser as any)?.profile?.brand === "string" && (landlordUser as any).profile.brand) ||
    (typeof (landlordUser as any)?.companyName === "string" && (landlordUser as any).companyName) ||
    (typeof (landlordUser as any)?.brandName === "string" && (landlordUser as any).brandName) ||
    "";

  const templateOverride = await getActiveTenancyProceedLetterTemplateText().catch(() => null);

  const seed = seedTenancyProceedLetter({
    applicantName: application.applicantName,
    propertyLabel,
    templateOverride,
  });

  const applicantResponse = application.stage1?.viewingSummary?.applicantResponse;
  const canSend = applicantResponse?.status === "confirmed";

  const existing = (application as any)?.stage2?.proceedLetter;

  const existingSavedAt = typeof existing?.savedAt === "string" ? existing.savedAt : null;
  const existingSentAt = typeof existing?.sentAt === "string" ? existing.sentAt : null;
  const letterDate = existingSavedAt || existingSentAt;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  const applicationLink = `${baseUrl}/applicant/dashboard`;

  const viewingDate = application.stage1?.viewingDetails?.date;
  const viewingTime = application.stage1?.viewingDetails?.time;
  const viewingOccurredAt = application.stage1?.viewingSummary?.viewingOccurredAt || undefined;
  const dateTimeValue =
    viewingDate && viewingTime
      ? `${viewingDate} ${viewingTime}`
      : viewingDate
        ? viewingDate
        : viewingOccurredAt
          ? new Date(viewingOccurredAt).toLocaleString("en-GB")
          : formatEnGbDateOnly(letterDate ? new Date(letterDate) : new Date());

  const templateVars = {
    DATE: formatEnGbDateOnly(letterDate ? new Date(letterDate) : new Date()),
    DATE_TIME: dateTimeValue,
    APPLICANT_NAME: application.applicantName || "Applicant",
    PROPERTY_LABEL: propertyLabel || "the property",
    PROPERTY_ADDRESS: propertyLabel || "the property",
    APPLICATION_LINK: applicationLink,
    DASHBOARD_LINK: applicationLink,
    LANDLORD_NAME: landlordName,
    LANDLORD_EMAIL: landlordEmail ?? "",
    LANDLORD_PHONE: landlordPhone ?? "",
    LANDLORD_COMPANY: landlordCompany,
  };

  const existingSubjectRaw = typeof existing?.subject === "string" ? existing.subject : undefined;
  const existingContentRaw = typeof existing?.content === "string" ? existing.content : undefined;

  const existingSubject =
    typeof existingSubjectRaw === "string" && (existingSubjectRaw.includes("{{") || existingSubjectRaw.includes("["))
      ? applyTemplate(existingSubjectRaw, templateVars)
      : existingSubjectRaw;
  const existingContent =
    typeof existingContentRaw === "string" && (existingContentRaw.includes("{{") || existingContentRaw.includes("["))
      ? applyTemplate(existingContentRaw, templateVars)
      : existingContentRaw;

  const seedSubjectRendered = applyTemplate(seed.subject, templateVars);
  const seedContentRendered = applyTemplate(seed.content, templateVars);

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Proceed letter</h1>
          <p className="mt-1 text-sm text-slate-600">Defensible letter confirming the next stage after consent to proceed.</p>
        </div>
        <Link
          href={`/landlord/applications/${encodeURIComponent(id)}#activity`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to application
        </Link>
      </div>

      {!canSend ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
          This can only be sent after the applicant gives consent to proceed.
        </div>
      ) : null}

      <ProceedLetterEditor
        appId={id}
        applicantEmail={application.applicantEmail}
        applicantTel={application.applicantTel}
        seedSubject={seedSubjectRendered}
        seedContent={seedContentRendered}
        existing={
          existing
            ? {
                subject: existingSubject,
                content: existingContent,
                savedAt: existingSavedAt ?? undefined,
                sentAt: existingSentAt ?? undefined,
              }
            : undefined
        }
        canSend={canSend}
      />

      <div className="mt-6 text-sm text-slate-600 print:hidden">
        <Link href="/landlord/dashboard" className="text-indigo-600 hover:text-indigo-700">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

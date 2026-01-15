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

  const templateOverride = await getActiveTenancyProceedLetterTemplateText().catch(() => null);

  const seed = seedTenancyProceedLetter({
    applicantName: application.applicantName,
    propertyLabel,
    templateOverride,
  });

  const applicantResponse = application.stage1?.viewingSummary?.applicantResponse;
  const canSend = applicantResponse?.status === "confirmed";

  const existing = (application as any)?.stage2?.proceedLetter;

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
        seedSubject={seed.subject}
        seedContent={seed.content}
        existing={
          existing
            ? {
                subject: typeof existing?.subject === "string" ? existing.subject : undefined,
                content: typeof existing?.content === "string" ? existing.content : undefined,
                savedAt: typeof existing?.savedAt === "string" ? existing.savedAt : undefined,
                sentAt: typeof existing?.sentAt === "string" ? existing.sentAt : undefined,
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

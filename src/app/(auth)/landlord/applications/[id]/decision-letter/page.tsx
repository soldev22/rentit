import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import { getTenancyApplicationById } from "@/lib/tenancy-application";
import { NotificationTemplates } from "@/lib/notification-templates";
import DecisionLetterReview from "@/components/landlord/DecisionLetterReview";
import { formatAddress } from "@/lib/formatAddress";

export const dynamic = "force-dynamic";

type PropertyDoc = {
  title?: string;
  address?: { line1?: string; line2?: string; city?: string; postcode?: string };
  rentPcm?: number;
  deposit?: number;
  tenancyLengthMonths?: number;
  availabilityDate?: Date | string;
};

type AddressDoc = {
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
};

type UserDoc = {
  name?: string;
  email?: string;
  profile?: {
    phone?: string;
    address?: AddressDoc;
  };
  phone?: string;
  tel?: string;
};

function formatUkDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMultilineAddress(addr?: {
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
}): string {
  const parts = [addr?.line1, addr?.line2, addr?.city, addr?.postcode].filter(Boolean);
  return parts.length ? parts.join("\n") : "";
}

export default async function LandlordDecisionLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const application = await getTenancyApplicationById(id);
  if (!application) notFound();
  if (application.landlordId.toString() !== session.user.id) notFound();

  const decision = application.stage2?.landlordDecision?.status ?? "pending";
  if (decision !== "pass" && decision !== "fail") {
    redirect(`/landlord/applications/${id}/background-checks`);
  }

  const properties = await getCollection<PropertyDoc>("properties");
  const property = await properties.findOne({ _id: new ObjectId(application.propertyId.toString()) });

  const propertyTitle = property?.title || "Unknown Property";
  const propertyAddressLine = formatAddress(property?.address || {}, propertyTitle);
  const propertyAddressMultiline = formatMultilineAddress(property?.address);

  // Applicant address (prefer what was captured on the application; else use profile address if available)
  const applicantAddressFromApplication = application.applicantAddress;
  let applicantAddressFromProfile: AddressDoc | undefined;

  if (!applicantAddressFromApplication?.line1 && application.applicantId) {
    const users = await getCollection<UserDoc>("users");
    const user = await users.findOne({ _id: new ObjectId(application.applicantId.toString()) });
    applicantAddressFromProfile = user?.profile?.address;
  }

  const applicantAddress = applicantAddressFromApplication?.line1
    ? applicantAddressFromApplication
    : applicantAddressFromProfile;

  const applicantAddressMultiline = formatMultilineAddress(applicantAddress);

  // Landlord contact (from MongoDB users collection)
  const users = await getCollection<UserDoc>("users");
  const landlordUser = await users.findOne({ _id: new ObjectId(application.landlordId.toString()) });
  const landlordName = landlordUser?.name || session.user.name || "Landlord";
  const landlordEmail = landlordUser?.email;
  const landlordPhone = landlordUser?.profile?.phone || landlordUser?.phone || landlordUser?.tel;
  const landlordAddressMultiline = formatMultilineAddress(landlordUser?.profile?.address);

  const rentPcm = typeof property?.rentPcm === "number" ? property.rentPcm : undefined;
  const deposit = typeof property?.deposit === "number" ? property.deposit : undefined;
  const tenancyLengthMonths =
    typeof property?.tenancyLengthMonths === "number" ? property.tenancyLengthMonths : undefined;

  const availabilityDate = property?.availabilityDate
    ? new Date(property.availabilityDate)
    : undefined;
  const moveInDate = application.stage5?.moveInDate ? new Date(application.stage5.moveInDate) : undefined;

  const template =
    decision === "pass"
      ? NotificationTemplates.backgroundChecksApproved(propertyTitle)
      : NotificationTemplates.backgroundChecksDeclined(propertyTitle);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  const dashboardLink = `${baseUrl}/applicant/dashboard`;

  const notes = application.stage2?.landlordDecision?.notes;
  const notesLine = notes ? `\n\nLandlord notes: ${notes}` : "";

  const today = formatUkDateLong(new Date());
  const salutationName = application.coTenant
    ? `${application.applicantName} and ${application.coTenant.name}`
    : application.applicantName;

  const tenancyDetailsLines = [
    rentPcm !== undefined ? `Monthly rent: £${rentPcm} pcm` : "Monthly rent: [to be confirmed]",
    deposit !== undefined ? `Deposit: £${deposit}` : "Deposit: [to be confirmed]",
    tenancyLengthMonths !== undefined
      ? `Tenancy term: ${tenancyLengthMonths} months (initial term)`
      : "Tenancy term: [to be confirmed]",
    moveInDate ? `Proposed move-in date: ${formatUkDateLong(moveInDate)}` : null,
    availabilityDate ? `Property available from: ${formatUkDateLong(availabilityDate)}` : null,
  ].filter(Boolean);

  const nextStepsBlock =
    decision === "pass"
      ? `Next steps (tenancy details)\n${tenancyDetailsLines.map((l) => `- ${l}`).join("\n")}\n\nIf you would like to proceed, please confirm by replying to this email and we will move to the next stage (documents and tenancy agreement).`
      : `Next steps\n- Unfortunately we will not be progressing your application for this property.\n- You can view your application status here: ${dashboardLink}`;

  const applicantHeader = applicantAddressMultiline
    ? `${application.applicantName}\n${applicantAddressMultiline}`
    : `${application.applicantName}\n[Applicant address on file not available]`;

  const landlordHeaderParts = [
    landlordName,
    landlordAddressMultiline || undefined,
    landlordEmail ? `Email: ${landlordEmail}` : undefined,
    landlordPhone ? `Tel: ${landlordPhone}` : undefined,
  ].filter(Boolean);
  const landlordHeader = landlordHeaderParts.length ? landlordHeaderParts.join("\n") : "[Landlord contact not available]";

  const propertyHeader = propertyAddressMultiline
    ? propertyAddressMultiline
    : propertyAddressLine;

  const fallbackMessage =
    `From:\n${landlordHeader}\n\n` +
    `To:\n${applicantHeader}\n\n` +
    `Property:\n${propertyHeader}\n\n` +
    `Date: ${today}\n\n` +
    `Dear ${salutationName},\n\n` +
    `${template.message}\n\n` +
    `${nextStepsBlock}` +
    `${decision === "pass" ? `\n\nYou can also view your application status here: ${dashboardLink}` : ""}` +
    `${notesLine ? notesLine : ""}`;

  const prior = application.stage2?.landlordDecision?.notifiedContent;

  const initialSubject = prior?.subject || template.subject;
  const initialMessage = prior?.message || fallbackMessage;

  const defaultSms =
    decision === "pass"
      ? `Application update: Background checks approved for ${propertyTitle}. See dashboard: ${dashboardLink}`
      : `Application update: We can't proceed with your application for ${propertyTitle} at this time. See dashboard: ${dashboardLink}`;

  const initialSmsMessage = prior?.smsMessage || defaultSms;

  const recipients = [
    {
      label: `Primary applicant: ${application.applicantName}`,
      email: application.applicantEmail,
      tel: application.applicantTel,
    },
    ...(application.coTenant
      ? [
          {
            label: `Co-tenant: ${application.coTenant.name}`,
            email: application.coTenant.email,
            tel: application.coTenant.tel,
          },
        ]
      : []),
  ];

  const alreadyNotifiedAt = application.stage2?.landlordDecision?.notifiedAt;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Review decision letter</h1>
            <p className="mt-1 text-sm text-slate-600">
              Edit the email/SMS, confirm it’s good to go, then send.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/landlord/applications/${id}/background-checks`}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-medium"
            >
              Back to background checks
            </Link>
            <Link
              href={`/landlord/applications/${id}`}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-medium"
            >
              Application overview
            </Link>
          </div>
        </div>
      </div>

      <DecisionLetterReview
        applicationId={id}
        decision={decision}
        propertyTitle={propertyTitle}
        propertyAddressLine={propertyAddressLine}
        recipients={recipients}
        initialSubject={initialSubject}
        initialMessage={initialMessage}
        initialSmsMessage={initialSmsMessage}
        alreadyNotifiedAt={alreadyNotifiedAt}
        aiContext={{
          decision,
          letterDate: today,
          applicantName: application.applicantName,
          coTenantName: application.coTenant?.name,
          applicantAddress: applicantAddressMultiline,
          propertyTitle,
          propertyAddress: propertyAddressMultiline || propertyAddressLine,
          rentPcm,
          deposit,
          tenancyLengthMonths,
          availabilityDate: availabilityDate ? availabilityDate.toISOString() : undefined,
          moveInDate: moveInDate ? moveInDate.toISOString() : undefined,
          landlordNotes: notes || undefined,
          landlordName,
          landlordEmail,
          landlordPhone,
          landlordAddress: landlordAddressMultiline || undefined,
          dashboardLink,
        }}
      />
    </div>
  );
}

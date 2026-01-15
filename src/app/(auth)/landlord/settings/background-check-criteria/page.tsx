import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";

import { getCollection } from "@/lib/db";
import BackgroundCheckCriteriaForm from "@/components/landlord/BackgroundCheckCriteriaForm";
import {
  DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA,
  type LandlordBackgroundCheckCriteria,
} from "@/lib/landlordBackgroundCheckCriteria";

export const dynamic = "force-dynamic";

async function getCriteria(landlordId: string): Promise<LandlordBackgroundCheckCriteria> {
  const collection = await getCollection("landlord_background_check_criteria");
  const doc = await collection.findOne({ landlordId: new ObjectId(landlordId) });
  return (doc?.criteria ?? DEFAULT_LANDLORD_BACKGROUND_CHECK_CRITERIA) as LandlordBackgroundCheckCriteria;
}

export default async function LandlordBackgroundCheckCriteriaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  const criteria = await getCriteria(session.user.id);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Background check criteria</h1>
          <p className="mt-1 text-sm text-slate-600">
            Set your pass/fail guidance so you (and your insurer) stay aligned.
          </p>
        </div>

        <Link
          href="/landlord/dashboard"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="font-semibold text-slate-900">How this is used</div>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            This page stores your <span className="font-semibold">review criteria</span> so landlords can
            make a consistent decision.
          </li>
          <li>
            Automated checks still record their own PASS/FAIL results; your final decision is recorded
            on each application.
          </li>
        </ul>
      </div>

      <BackgroundCheckCriteriaForm initialCriteria={criteria} />
    </div>
  );
}

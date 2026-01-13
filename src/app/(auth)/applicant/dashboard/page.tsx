import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCollection } from "@/lib/db";
import type { TenancyApplication } from "@/lib/tenancy-application";
import { getUnifiedApplicationStatusView } from "@/lib/tenancyApplicationStatus";

export const dynamic = "force-dynamic";

type TenancyApplicationWithProperty = Pick<
  TenancyApplication,
  "status" | "currentStage" | "stage1" | "stage2" | "stage3" | "stage4"
> & {
  _id: ObjectId;
  propertyId?: ObjectId;
  createdAt?: Date | string;
  propertyTitle?: string;
  propertyStatus?: string;
  propertyRentPcm?: number;
  propertyBedrooms?: number;
  propertyBathrooms?: number;
  propertyRooms?: number;
  propertySizeSqm?: number;
  propertyFurnished?: string;
  propertyDeposit?: number;
  propertyTenancyLengthMonths?: number;
  propertyPetsAllowed?: boolean;
  propertySmokingAllowed?: boolean;
  propertyEpcRating?: string;
  propertyCouncilTaxBand?: string;
  propertyParking?: string;
  propertyBillsIncluded?: string[];
  propertyHeroPhoto?: { url?: string; isHero?: boolean } | null;
  propertyPhotos?: Array<{ url: string; isHero?: boolean }>;
  propertyAddressLine1?: string;
  propertyAddressLine2?: string;
  propertyAddressCity?: string;
  propertyAddressPostcode?: string;
};

export default async function ApplicantDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(
      `/api/auth/signin?callbackUrl=${encodeURIComponent("/applicant/dashboard")}`
    );
  }

  if (session.user.role !== "APPLICANT") {
    redirect("/dashboard");
  }

  if (!session.user.id) {
    redirect("/dashboard");
  }

  const applicantId = new ObjectId(session.user.id);

  const applications = await getCollection("tenancy_applications");

  const pipeline = [
    { $match: { applicantId } },
    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "propertyInfo"
      }
    },
    {
      $addFields: {
        property: { $arrayElemAt: ["$propertyInfo", 0] }
      }
    },
    {
      $addFields: {
        propertyTitle: "$property.title",
        propertyStatus: "$property.status",
        propertyRentPcm: "$property.rentPcm",
        propertyBedrooms: "$property.bedrooms",
        propertyBathrooms: "$property.bathrooms",
        propertyRooms: "$property.rooms",
        propertySizeSqm: "$property.sizeSqm",
        propertyFurnished: "$property.furnished",
        propertyDeposit: "$property.deposit",
        propertyTenancyLengthMonths: "$property.tenancyLengthMonths",
        propertyPetsAllowed: "$property.petsAllowed",
        propertySmokingAllowed: "$property.smokingAllowed",
        propertyEpcRating: "$property.epcRating",
        propertyCouncilTaxBand: "$property.councilTaxBand",
        propertyParking: "$property.parking",
        propertyBillsIncluded: "$property.billsIncluded",
        propertyPhotos: { $ifNull: ["$property.photos", []] },
        propertyAddressLine1: "$property.address.line1",
        propertyAddressLine2: "$property.address.line2",
        propertyAddressCity: "$property.address.city",
        propertyAddressPostcode: "$property.address.postcode",
        propertyHeroPhoto: {
          $let: {
            vars: {
              photos: { $ifNull: ["$property.photos", []] },
              heroPhotos: {
                $filter: {
                  input: { $ifNull: ["$property.photos", []] },
                  as: "p",
                  cond: { $eq: ["$$p.isHero", true] }
                }
              }
            },
            in: {
              $ifNull: [
                { $arrayElemAt: ["$$heroPhotos", 0] },
                { $arrayElemAt: ["$$photos", 0] }
              ]
            }
          }
        }
      }
    },
    { $project: { propertyInfo: 0, property: 0 } },
    { $sort: { createdAt: -1, _id: -1 } }
  ];

  const results = (await applications
    .aggregate(pipeline)
    .toArray()) as unknown as TenancyApplicationWithProperty[];

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Applicant dashboard</h1>
        <p className="text-sm text-slate-600">Properties you’ve applied to rent.</p>
      </header>

      {results.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-700">You haven’t applied for any properties yet.</p>
          <Link
            className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline"
            href="/public/properties"
          >
            Browse available properties
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {results.map((app) => {
            const propertyId = app.propertyId?.toString();
            const title = app.propertyTitle || "Property";
            const address = [
              app.propertyAddressLine1,
              app.propertyAddressLine2,
              app.propertyAddressCity,
              app.propertyAddressPostcode
            ]
              .filter(Boolean)
              .join(", ");
            const appliedAt = app.createdAt ? new Date(app.createdAt) : null;

            const photos = app.propertyPhotos || [];
            const heroPhoto = photos.find((p) => p?.isHero) || photos[0];
            const unified = getUnifiedApplicationStatusView(app);

            return (
              <article
                key={app._id.toString()}
                className="rounded-xl border bg-warm p-4 shadow-sm hover:shadow-md"
              >
                <Link
                  href={propertyId ? `/public/properties/${propertyId}` : "/applicant/dashboard"}
                  className="block"
                  aria-label={propertyId ? `View property ${title}` : title}
                >
                  <div className="w-full aspect-[4/3] rounded-md overflow-hidden mb-3 bg-gray-100 relative">
                    {heroPhoto?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroPhoto.url}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-sm text-gray-400 h-full flex items-center justify-center">
                        No image
                      </div>
                    )}

                    {typeof app.propertyRentPcm === "number" ? (
                      <div className="absolute left-3 top-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-md text-sm">
                        £{app.propertyRentPcm}/pcm
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-heading truncate text-text-dark">{title}</h2>
                    {typeof app.propertyRentPcm === "number" ? (
                      <div className="text-sm text-text-dark font-semibold">£{app.propertyRentPcm}</div>
                    ) : null}
                  </div>

                  {address ? <div className="text-sm text-gray-700">{address}</div> : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                      {typeof app.propertyBedrooms === "number" ? (
                        <div>🛏 {app.propertyBedrooms}</div>
                      ) : null}
                      {typeof app.propertyBathrooms === "number" ? (
                        <div>🛁 {app.propertyBathrooms}</div>
                      ) : null}
                      {typeof app.propertyRooms === "number" ? (
                        <div>🚪 {app.propertyRooms}</div>
                      ) : null}
                      {typeof app.propertySizeSqm === "number" ? (
                        <div>📐 {app.propertySizeSqm} sqm</div>
                      ) : null}
                      {app.propertyFurnished && app.propertyFurnished !== "unknown" ? (
                        <div>{app.propertyFurnished}</div>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white bg-gray-700">
                        {unified.label}
                      </span>
                      {unified.detail ? (
                        <div className="mt-1 text-xs text-gray-600">{unified.detail}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    {typeof app.propertyDeposit === "number" ? (
                      <div>Deposit: £{app.propertyDeposit}</div>
                    ) : null}
                    {typeof app.propertyTenancyLengthMonths === "number" ? (
                      <div>Tenancy length: {app.propertyTenancyLengthMonths} months</div>
                    ) : null}
                    {typeof app.propertyPetsAllowed === "boolean" ? (
                      <div>Pets allowed: {app.propertyPetsAllowed ? "Yes" : "No"}</div>
                    ) : null}
                    {typeof app.propertySmokingAllowed === "boolean" ? (
                      <div>Smoking allowed: {app.propertySmokingAllowed ? "Yes" : "No"}</div>
                    ) : null}
                    {app.propertyEpcRating ? <div>EPC: {app.propertyEpcRating}</div> : null}
                    {app.propertyCouncilTaxBand ? (
                      <div>Council tax band: {app.propertyCouncilTaxBand}</div>
                    ) : null}
                    {app.propertyParking ? <div>Parking: {app.propertyParking}</div> : null}
                    {Array.isArray(app.propertyBillsIncluded) && app.propertyBillsIncluded.length > 0 ? (
                      <div>Bills included: {app.propertyBillsIncluded.join(", ")}</div>
                    ) : null}
                    {appliedAt ? <div>Applied: {appliedAt.toLocaleString()}</div> : null}
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

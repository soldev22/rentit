import { getCollection } from '@/lib/db';
import { ObjectId, type WithId } from 'mongodb';
import PropertyGallery from '@/components/PropertyGallery';
import ShareButtons from '@/components/ShareButtons';
import ApplyButton from '@/components/ApplyButton';
import { formatDateShort } from '@/lib/formatDate';
import { formatPropertyLabel } from "@/lib/formatPropertyLabel";
import Link from "next/link";
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUnifiedApplicationStatusView } from '@/lib/tenancyApplicationStatus';
import { TENANCY_APPLICATION_STAGE_LABELS } from '@/lib/tenancyApplicationStages';
import type { TenancyApplication } from '@/lib/tenancy-application';

export const dynamic = 'force-dynamic';

interface RawProperty {
  _id: ObjectId;
  title?: string;
  description?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  };
  rentPcm?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: string;
  deposit?: number;
  tenancyLengthMonths?: number;
  billsIncluded?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  epcRating?: string;
  councilTaxBand?: string;
  sizeSqm?: number;
  parking?: string;
  amenities?: string[];
  virtualTourUrl?: string;
  floor?: string | number;
  hmoLicenseRequired?: boolean;
  viewingInstructions?: string;
  status?: string;
 photos?: Array<{
  url: string;
  isHero?: boolean;
}>;

  createdAt?: Date | string;
}

async function getPropertyById(id: string) {
  const col = await getCollection('properties');
  let p: RawProperty | null = null;
  try {
    p = await col.findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error('getPropertyById error (invalid id or DB):', err);
    return null;
  }

  if (!p) return null;
  return {
    _id: p._id.toString(),
    title: p.title,
    description: p.description,
    address: p.address,
    rentPcm: p.rentPcm,
    rooms: p.rooms,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    furnished: p.furnished,
    deposit: p.deposit,
    tenancyLengthMonths: p.tenancyLengthMonths,
    billsIncluded: p.billsIncluded || [],
    petsAllowed: p.petsAllowed,
    smokingAllowed: p.smokingAllowed,
    epcRating: p.epcRating,
    councilTaxBand: p.councilTaxBand,
    sizeSqm: p.sizeSqm,
    parking: p.parking,
    amenities: p.amenities || [],
    virtualTourUrl: p.virtualTourUrl,
    floor: p.floor,
    hmoLicenseRequired: p.hmoLicenseRequired,
    viewingInstructions: p.viewingInstructions,
    status: p.status,
   photos: (p.photos || []).map(photo => ({
  url: photo.url,
  isHero: photo.isHero === true,
})),

    createdAt: p.createdAt,
  };
}

export default async function PropertyDetailPage(
  {
    params,
  }: {
    params: { id: string } | Promise<{ id: string }>;
  }
) {
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
    return typeof (value as Promise<T>)?.then === 'function';
  }

  const resolvedParams = isPromise(params) ? await params : params;
  const { id } = resolvedParams;

  // If an applicant is logged in, fetch their most recent application for this property
  // so we can show stage/status at the top of the page.
  const session = await getServerSession(authOptions);
  let applicantApplication: WithId<TenancyApplication> | null = null;

  if (
    (session?.user?.role === 'APPLICANT' || session?.user?.role === 'TENANT') &&
    ObjectId.isValid(id) &&
    (ObjectId.isValid(session.user.id) || Boolean(session.user.email))
  ) {
    try {
      const applications = await getCollection<TenancyApplication>('tenancy_applications');

      const rawEmail = session.user.email ? String(session.user.email).trim() : null;
      const emailRegex = rawEmail ? new RegExp(`^${escapeRegex(rawEmail)}$`, 'i') : null;

      // Be tolerant of legacy records where IDs may have been stored as strings.
      const applicantClauses: Record<string, unknown>[] = [];
      if (ObjectId.isValid(session.user.id)) {
        applicantClauses.push({ applicantId: new ObjectId(session.user.id) });
        applicantClauses.push({ applicantId: session.user.id });
      }
      if (emailRegex) {
        applicantClauses.push({ applicantEmail: emailRegex });
        applicantClauses.push({ 'coTenant.email': emailRegex });
      }

      const propertyClauses: Record<string, unknown>[] = [
        { propertyId: new ObjectId(id) },
        { propertyId: id },
      ];

      applicantApplication = await applications.findOne(
        applicantClauses.length
          ? {
              $and: [{ $or: applicantClauses }, { $or: propertyClauses }],
            }
          : {
              $or: propertyClauses,
            },
        { sort: { createdAt: -1 } }
      );
    } catch (err) {
      console.error('Error fetching applicant application for property:', err);
      applicantApplication = null;
    }
  }

  const property = await getPropertyById(id);
  if (!property) return <div className="p-6">Property not found</div>;

  // Compose full address string
  const address = [
    property.address?.line1,
    property.address?.line2,
    property.address?.city,
    property.address?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  // Add a search/filter button above the property details
  // (This is a server component, so use a link to the public properties page for filtering)
  // If you want a client-side filter, convert this to a client component and use useRouter.

  return (
    <main className="mx-auto max-w-5xl p-6">
      {applicantApplication ? (() => {
        const unified = getUnifiedApplicationStatusView(applicantApplication);
        const stageLabel = TENANCY_APPLICATION_STAGE_LABELS[applicantApplication.currentStage];

        const landlordDecisionStatus = applicantApplication.stage2?.landlordDecision?.status;
        const primaryCheck = applicantApplication.stage2?.creditCheck;
        const coCheck = applicantApplication.coTenant ? applicantApplication.stage2?.coTenant?.creditCheck : undefined;
        const primaryFailed = Boolean(primaryCheck && (primaryCheck.status === 'failed' || primaryCheck.passed === false));
        const coFailed = Boolean(coCheck && (coCheck.status === 'failed' || coCheck.passed === false));
        const hasAnyCreditFailure = primaryFailed || coFailed;

        const overallStatusLabel = (() => {
          if (landlordDecisionStatus === 'fail') return "Can’t proceed";

          // Only treat legacy 'rejected' as terminal if there is an active failure.
          if (applicantApplication.status === 'rejected' && hasAnyCreditFailure) return "Can’t proceed";
          if (applicantApplication.status === 'refused') return "Can’t proceed";
          if (applicantApplication.status === 'cancelled') return "Cancelled";
          if (applicantApplication.status === 'completed') return "Completed";
          if (applicantApplication.status === 'accepted') return "Accepted";
          if (applicantApplication.status === 'approved') return "Approved";

          return "In progress";
        })();

        const viewingAgreed =
          applicantApplication.stage1?.status === 'agreed' ||
          Boolean(applicantApplication.stage1?.agreedAt) ||
          Boolean(applicantApplication.stage1?.viewingDetails?.date);
        const hasCoTenant = Boolean(applicantApplication.coTenant);
        const showAddCoTenantCta = !hasCoTenant;
        const canAddCoTenant = viewingAgreed && showAddCoTenantCta;
        const applicantApplicationId = applicantApplication._id ? applicantApplication._id.toString() : null;

        return (
          <section className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4" aria-label="Your application status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-green-900">Your application</div>
                <div className="mt-1 text-lg font-bold text-green-900">
                  <span className="font-bold">{overallStatusLabel}</span>
                  <span className="mx-2 text-green-700">•</span>
                  <span className="font-bold">Stage {applicantApplication.currentStage}</span>: {stageLabel}
                </div>
                <div className="mt-1 text-lg font-bold text-green-800">
                  {unified.label}{unified.detail ? ` — ${unified.detail}` : ''}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {showAddCoTenantCta && applicantApplicationId ? (
                  canAddCoTenant ? (
                    <Link
                      href={`/application/co-tenant/${applicantApplicationId}`}
                      className="inline-flex items-center rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Add co-tenant
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
                      title="Available after the viewing is agreed"
                    >
                      Add co-tenant
                    </button>
                  )
                ) : null}

                <Link
                  href="/applicant/dashboard"
                  className="inline-flex items-center rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
                >
                  View in dashboard
                </Link>
              </div>
            </div>

            {showAddCoTenantCta ? (
              <div className="mt-2 text-xs text-green-900">
                {canAddCoTenant
                  ? 'You can add a second applicant (max 2 signatories).'
                  : 'You can add a second applicant once the viewing is agreed.'}
              </div>
            ) : null}
          </section>
        );
      })() : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PropertyGallery photos={property.photos} />

          <div className="mt-4">
            <h1 className="text-3xl font-bold mb-1">{property.title}</h1>
            <div className="text-sm text-gray-600 mb-3">{address}</div>

            <div className="prose max-w-none">
              <p>{property.description}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">Listed:</div>
                <div className="text-sm font-medium">{property.createdAt ? formatDateShort(property.createdAt) : ''}</div>
              </div>

              <ShareButtons title={property.title} />
            </div>
          </div>
        </div>

        <aside className="border rounded-md p-6 h-fit" aria-labelledby="property-sidebar">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-gray-500">Rent</div>
              <div className="text-2xl font-bold" data-testid="prop-price">£{property.rentPcm} <span className="text-sm font-medium">pcm</span></div>
            </div>
            <div>
              <span className={`inline-block rounded px-3 py-1 text-xs font-semibold ${property.status === 'listed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`} data-testid="prop-status-badge">
                {property.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            {/* Client-side apply button handles auth and starts the application workflow */}
            <ApplyButton 
              propertyId={property._id} 
                propertyTitle={formatPropertyLabel(property)}
              isApplied={Boolean(applicantApplication)}
            />
          </div>

          <div className="mt-6 text-sm text-gray-700 space-y-2" id="property-sidebar">
            {property.rooms && <div><span className="font-semibold">Rooms:</span> {property.rooms}</div>}
            {property.bedrooms !== undefined && <div data-testid="prop-detail-bedrooms"><span className="font-semibold">Bedrooms:</span> {property.bedrooms}</div>}
            {property.bathrooms !== undefined && <div data-testid="prop-detail-bathrooms"><span className="font-semibold">Bathrooms:</span> {property.bathrooms}</div>}
            {property.furnished && property.furnished !== 'unknown' && <div data-testid="prop-detail-furnished"><span className="font-semibold">Furnished:</span> {property.furnished}</div>}
            {property.sizeSqm !== undefined && <div data-testid="prop-detail-size"><span className="font-semibold">Size:</span> {property.sizeSqm} sqm</div>}
            {property.deposit !== undefined && <div data-testid="prop-detail-deposit"><span className="font-semibold">Deposit:</span> £{property.deposit}</div>}
            {property.tenancyLengthMonths !== undefined && <div data-testid="prop-detail-tenancy"><span className="font-semibold">Tenancy:</span> {property.tenancyLengthMonths} months</div>}
            {property.billsIncluded && property.billsIncluded.length > 0 && <div data-testid="prop-detail-bills"><span className="font-semibold">Bills:</span> {property.billsIncluded.join(', ')}</div>}
            {property.amenities && property.amenities.length > 0 && <div data-testid="prop-detail-amenities"><span className="font-semibold">Amenities:</span> <ul className="list-disc list-inside">{property.amenities.map((a:string)=> <li key={a} className="capitalize">{a.replace('_',' ')}</li>)}</ul></div>}
            {property.virtualTourUrl && <div data-testid="prop-detail-virtual"><a href={property.virtualTourUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Virtual tour</a></div>}
            {property.viewingInstructions && <div data-testid="prop-detail-viewing"><span className="font-semibold">Viewing:</span> <div className="text-sm text-gray-600">{property.viewingInstructions}</div></div>}
          </div>
        </aside>
      </div>
    </main>
  );
}

import { getTenancyApplicationById, TenancyApplication } from "@/lib/tenancy-application";

/**
 * Validates that the supplied token matches the application.
 * Returns the application if valid, otherwise null.
 */
async function verifyToken(
  appId: string,
  token?: string
): Promise<TenancyApplication | null> {
  if (!token) return null;

  const applicationDoc = await getTenancyApplicationById(appId);
  if (!applicationDoc) return null;

  // Cast the result to TenancyApplication (we trust the DB shape)
  const application = applicationDoc as TenancyApplication;

  // The token is stored in stage2.token
  if (application.stage2?.token !== token) return null;

  return application;
}

export default async function ApplicationCompletePage(props: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams: { token?: string; submitted?: string } | Promise<{ token?: string; submitted?: string }>;
}) {
  // Unwrap params and searchParams if they are Promises (per Next.js App Router requirements)
  const params = props.params instanceof Promise ? await props.params : props.params;
  const searchParams = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams;
  const { id } = params;
  const { token, submitted, error } = searchParams as typeof searchParams & { error?: string };

  // Thank-you state after successful submission
  if (submitted === "1") {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-green-700">Thank you!</h2>
        <p className="text-gray-700">
          Your background information has been submitted successfully.
          The landlord will review your application and contact you if
          further information is needed.
        </p>
      </div>
    );
  }

  const application = await verifyToken(id, token);

  // Invalid or expired token
  if (!application) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-700">
          Invalid or expired link
        </h2>
        <p className="text-gray-600">
          The link you used is invalid or has expired.
          Please contact your landlord for a new link.
        </p>
      </div>
    );
  }

  // Block the form if the token has already been used
  if (application.stage2?.tokenUsed) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-yellow-700">
          Link already used
        </h2>
        <p className="text-gray-600">
          This background check link has already been used. If you need to resubmit your information, please contact your landlord for a new link.
        </p>
      </div>
    );
  }

  // Background information form
  return (
    <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Complete Your Application</h2>
      <p className="mb-4 text-gray-700">
        Welcome, {application.applicantName}. Please provide the required
        background information to continue your application for this property.
      </p>

      {/* Show file upload/type/size error if present */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {decodeURIComponent(error)}
        </div>
      )}

      <form
        className="space-y-4"
        action={`/api/tenancy-applications/${application._id}/background-info?token=${encodeURIComponent(token ?? "")}`}
        method="POST"
        encType="multipart/form-data"
      >
        <div>
          <label htmlFor="employmentStatus" className="block font-medium mb-1">
            Employment Status *
          </label>
          <select
            id="employmentStatus"
            name="employmentStatus"
            className="w-full border rounded p-2"
            required
          >
            <option value="">Select…</option>
            <option value="employed">Employed</option>
            <option value="self-employed">Self-employed</option>
            <option value="unemployed">Unemployed</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Employer Name</label>
          <input
            name="employerName"
            className="w-full border rounded p-2"
            placeholder="If employed or self-employed"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Current Employer Email</label>
          <input
            name="employerEmail"
            type="email"
            className="w-full border rounded p-2"
            placeholder="So we can request an employment confirmation"
          />
          <div className="text-xs text-gray-500 mt-1">
            If employed, please provide an employer email for verification.
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Previous Employer Name</label>
          <input
            name="previousEmployerName"
            className="w-full border rounded p-2"
            placeholder="If you changed jobs recently"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Previous Employer Email</label>
          <input
            name="previousEmployerEmail"
            type="email"
            className="w-full border rounded p-2"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Employment Contract Type</label>
          <select
            id="employmentContractType"
            name="employmentContractType"
            title="Employment contract type"
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option value="">Select…</option>
            <option value="permanent">Permanent</option>
            <option value="fixed_term">Fixed-term</option>
            <option value="agency">Agency</option>
            <option value="zero_hours">Zero-hours</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Job Title</label>
          <input
            name="jobTitle"
            className="w-full border rounded p-2"
            placeholder="If employed or self-employed"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Monthly Income (£) *
          </label>
          <input
            name="monthlyIncome"
            type="number"
            min="0"
            step="any"
            className="w-full border rounded p-2"
            required
            placeholder="Enter your monthly income"
            title="Monthly Income"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Length of Employment
          </label>
          <input
            name="employmentLength"
            className="w-full border rounded p-2"
            placeholder="e.g. 2 years 3 months"
            title="Enter the length of your employment"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Previous Landlord Name
          </label>
          <input
            name="prevLandlordName"
            className="w-full border rounded p-2"
            placeholder="Enter previous landlord's name"
            title="Enter your previous landlord's name"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Previous Landlord Contact
          </label>
          <input
            name="prevLandlordContact"
            className="w-full border rounded p-2"
            placeholder="e.g. 07700 900123 or email"
            title="Enter your previous landlord's contact (phone or email)"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Previous Landlord Email</label>
          <input
            name="prevLandlordEmail"
            type="email"
            className="w-full border rounded p-2"
            placeholder="So we can request a reference"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Photo ID (passport, driving licence, or national ID) – Front *
          </label>
          <input
            name="photoIdFront"
            type="file"
            accept="image/*,application/pdf"
            className="w-full border rounded p-2 mb-2"
            required
            placeholder="Upload front of your photo ID"
            title="Photo ID Front Upload"
          />
          <label className="block font-medium mb-1 mt-4">
            Photo ID – Back (if applicable)
          </label>
          <input
            name="photoIdBack"
            type="file"
            accept="image/*,application/pdf"
            className="w-full border rounded p-2"
            placeholder="Upload back of your photo ID (if applicable)"
            title="Photo ID Back Upload"
          />
          <div className="text-xs text-gray-500 mt-1">If your ID has information on both sides, please upload both. Otherwise, just upload the front.</div>
        </div>

        <div className="flex items-center">
          <input
            name="creditConsent"
            type="checkbox"
            required
            className="mr-2"
            title="Credit Consent"
          />
          <span className="text-sm">
            I consent to a credit check being performed as part of my application *
          </span>
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

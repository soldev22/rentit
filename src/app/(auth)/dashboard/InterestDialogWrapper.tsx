"use client";
"use client";
import { useState } from "react";
import InterestDialog from "@/components/landlord/InterestDialog";
import ManageUserModal from "@/components/landlord/ManageUserModal";
import { useRouter } from "next/navigation";

export default function InterestDialogWrapper({ properties }: { properties: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<any | null>(null);
  const [manageUserId, setManageUserId] = useState<string | null>(null);
  const router = useRouter();

  const handleInterestClick = (interest: any) => {
    setSelectedInterest(interest);
    setDialogOpen(true);
  };

  const handleEditUser = (applicantId: string) => {
    setDialogOpen(false);
    setManageUserId(applicantId);
  };

  const handleMessage = (applicantId: string) => {
    setDialogOpen(false);
    // Navigate to a dialogue/chat page for this user (stub: /landlord/dialogue/[applicantId])
    router.push(`/landlord/dialogue/${applicantId}`);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map((property) => (
          <div key={property._id} className="bg-white rounded-xl shadow p-5">
            <div className="mb-2">
              <span className="font-semibold text-indigo-700 text-lg">{property.title}</span>
              <span className="ml-2 text-gray-500 text-sm">({property.address.line1}, {property.address.city}, {property.address.postcode})</span>
            </div>
            <div className="mb-2 text-gray-700">Rent: £{property.rentPcm} pcm</div>
            <div className="mb-2 text-xs text-gray-500">Created {new Date(property.createdAt).toLocaleDateString()}</div>
            {property.interests && property.interests.length > 0 ? (
              <div className="mt-3">
                <div className="font-semibold text-sm mb-1 text-indigo-700">Registered Interests:</div>
                <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto border">
                  {property.interests.map((interest: any, idx: number) => (
                    <div
                      key={idx}
                      className="mb-2 pb-2 border-b last:border-b-0 last:mb-0 last:pb-0 cursor-pointer hover:bg-indigo-50 rounded"
                      onClick={() => handleInterestClick({ ...interest, applicantId: interest.applicantId })}
                      title="View & interact with applicant"
                    >
                      <div className="font-semibold">{interest.applicantName}</div>
                      <div className="text-xs text-gray-700">Email: {interest.applicantEmail}</div>
                      {interest.applicantTel && <div className="text-xs text-gray-700">Tel: {interest.applicantTel}</div>}
                      {interest.date && <div className="text-xs text-gray-500">{new Date(interest.date).toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-400">No registered interests yet.</div>
            )}
          </div>
        ))}
      </div>
      <InterestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        interest={selectedInterest}
        onEditUser={handleEditUser}
        onMessage={handleMessage}
      />
      {manageUserId && (
        <ManageUserModal userId={manageUserId} onClose={() => setManageUserId(null)} />
      )}
    </>
  );
}
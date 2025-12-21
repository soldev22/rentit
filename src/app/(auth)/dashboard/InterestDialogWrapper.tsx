"use client";

import { useState } from "react";
import InterestDialog from "@/components/landlord/InterestDialog";
import ManageUserModal from "@/components/landlord/ManageUserModal";
import { useRouter } from "next/navigation";

export default function InterestDialogWrapper({ property }: { property: any }) {
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
    router.push(`/landlord/dialogue/${applicantId}`);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded-xl shadow p-5">
        <div>
          <div className="mb-2">
            <span className="font-semibold text-indigo-700 text-lg">
              {property.title}
            </span>
            <div className="text-gray-500 text-sm">
              {property.address.line1}, {property.address.city},{" "}
              {property.address.postcode}
            </div>
          </div>

          <div className="mb-2 text-gray-700">
            Rent: £{property.rentPcm.toLocaleString("en-GB")} pcm
          </div>

          <div className="mb-3 text-xs text-gray-500">
            Created {new Date(property.createdAt).toLocaleDateString("en-GB")}
          </div>
        </div>

        <div className="mt-auto">
          {property.interests?.length > 0 ? (
            <>
              <div className="font-semibold text-sm mb-2 text-indigo-700">
                Registered interests
              </div>
              <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto border">
                {property.interests.map((interest: any, idx: number) => (
                  <div
                    key={idx}
                    className="mb-2 pb-2 border-b last:border-b-0 last:mb-0 last:pb-0 cursor-pointer hover:bg-indigo-50 rounded"
                    onClick={() => handleInterestClick(interest)}
                  >
                    <div className="font-semibold">
                      {interest.applicantName}
                    </div>
                    <div className="text-xs text-gray-700">
                      {interest.applicantEmail}
                    </div>
                    {interest.applicantTel && (
                      <div className="text-xs text-gray-700">
                        {interest.applicantTel}
                      </div>
                    )}
                    {interest.date && (
                      <div className="text-xs text-gray-500">
                        {new Date(interest.date).toLocaleString("en-GB")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400">
              No registered interests yet
            </div>
          )}
        </div>
      </div>

      <InterestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        interest={selectedInterest}
        onEditUser={handleEditUser}
        onMessage={handleMessage}
      />

      {manageUserId && (
        <ManageUserModal
          userId={manageUserId}
          onClose={() => setManageUserId(null)}
        />
      )}
    </>
  );
}

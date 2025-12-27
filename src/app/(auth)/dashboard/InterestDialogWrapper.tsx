"use client";

import { useState, useEffect } from "react";
import  InterestDialog  from "@/components/landlord/InterestDialog";
import ManageUserModal from "@/components/landlord/ManageUserModal";
import { useRouter } from "next/navigation";
import { formatDateShort, formatDateTime } from "@/lib/formatDate"; 


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


  // State to hold latest user names for interests
  const [interestUserNames, setInterestUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchNames() {
      if (!property.interests) return;
      const updates: Record<string, string> = {};
      await Promise.all(
        property.interests.map(async (interest: any) => {
          if (interest.applicantId) {
            try {
              const res = await fetch(`/api/admin/users/${interest.applicantId}`);
              if (res.ok) {
                const data = await res.json();
                updates[interest.applicantId] = data.user?.name || interest.applicantName;
              } else {
                updates[interest.applicantId] = interest.applicantName;
              }
            } catch {
              updates[interest.applicantId] = interest.applicantName;
            }
          }
        })
      );
      setInterestUserNames(updates);
    }
    fetchNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.interests?.length]);

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded-xl shadow p-5">
        <div>
          <div className="mb-2">
            <span className="font-semibold text-indigo-700 text-lg">
              {property.title}
            </span>
            <div className="text-gray-500 text-sm">
              {property.address.line1}, {property.address.city}, {property.address.postcode}
            </div>
          </div>

          <div className="mb-2 text-gray-700">
            Rent: £{property.rentPcm.toLocaleString("en-GB")} pcm
          </div>

          <div className="mb-3 text-xs text-gray-500">
            Created {formatDateShort(property.createdAt)}
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
                    className="mb-2 pb-2 border-b last:border-b-0 last:mb-0 last:pb-0 flex items-center gap-2 hover:bg-indigo-50 rounded"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleInterestClick(interest)}
                    >
                      <div className="font-semibold">
                        {interestUserNames[interest.applicantId] || interest.applicantName}
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
                          {formatDateTime(interest.date)}
                        </div>
                      )}
                    </div>
                    {/* Edit button */}
                    <a
                      href={`/landlord/applications/${interest.applicationId || interest._id || ''}/edit`}
                      className="ml-2 text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-200 bg-blue-50"
                      title="Edit Application"
                    >
                      ✏️ Edit
                    </a>
                    {/* Delete button */}
                    <button
                      className="ml-2 text-red-600 hover:text-white hover:bg-red-600 text-sm px-2 py-1 rounded border border-red-200 bg-red-50"
                      title="Delete Application"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this application?')) {
                          const appId = interest.applicationId || interest._id;
                          if (!appId) return alert('No application ID found.');
                          const res = await fetch(`/api/tenancy-applications/${appId}`, { method: 'DELETE' });
                          if (res.ok) {
                            router.refresh();
                          } else {
                            alert('Failed to delete application.');
                          }
                        }
                      }}
                    >
                      🗑️ Delete
                    </button>
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

      {selectedInterest && (
        <InterestDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          interest={selectedInterest}
          propertyId={property._id}
          onEditUser={handleEditUser}
          onMessage={handleMessage}
        />
      )}

      {manageUserId && (
        <ManageUserModal
          userId={manageUserId}
          onClose={() => setManageUserId(null)}
        />
      )}
    </>
  );
}

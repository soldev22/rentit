"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/admin/AdminModal";
import { formatDateTime } from "@/lib/formatDate";

interface InterestDialogProps {
  open: boolean;
  onClose: () => void;
  interest: {
    applicantName: string;
    applicantEmail: string;
    applicantTel?: string;
    date?: string;
    applicantId: string;
  };
  onEditUser?: (applicantId: string) => void;
  onMessage?: (applicantId: string) => void;
}
    export default function InterestDialog({ open, onClose, interest, onEditUser, onMessage }: InterestDialogProps) {
      const [userDetails, setUserDetails] = useState<any | null>(null);

      useEffect(() => {
        async function fetchUser() {
          if (!interest.applicantId) return;
          try {
            const res = await fetch(`/api/admin/users/${interest.applicantId}`);
            if (res.ok) {
              const data = await res.json();
              setUserDetails(data);
            }
          } catch {}
        }
        if (open) fetchUser();
         
      }, [interest.applicantId, open]);

      if (!open) return null;
      return (
        <Modal onClose={onClose} title="Applicant Details">
          <div className="mb-2 space-y-2">
            <div className="text-lg font-bold text-gray-900">{userDetails?.name || interest.applicantName}</div>
            <div className="flex flex-col gap-1 text-sm text-gray-700">
              <div><span className="font-semibold">Email:</span> {userDetails?.email || interest.applicantEmail}</div>
              {userDetails?.phone && <div><span className="font-semibold">Phone:</span> {userDetails.phone}</div>}
              {userDetails?.role && <div><span className="font-semibold">Role:</span> {userDetails.role}</div>}
              {userDetails?.address && typeof userDetails.address === 'object' && (
                <div className="bg-gray-50 rounded p-2 mt-2">
                  <div className="font-semibold text-gray-800 mb-1">Address Details:</div>
                  {userDetails.address.line1 && (
                    <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Address Line 1:</span> {userDetails.address.line1}</div>
                  )}
                  {userDetails.address.line2 && (
                    <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Address Line 2:</span> {userDetails.address.line2}</div>
                  )}
                  {userDetails.address.city && (
                    <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">City:</span> {userDetails.address.city}</div>
                  )}
                  {userDetails.address.county && (
                    <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">County:</span> {userDetails.address.county}</div>
                  )}
                  {userDetails.address.postcode && (
                    <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Postcode:</span> {userDetails.address.postcode}</div>
                  )}
                  {userDetails.address.country && (
                    <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Country:</span> {userDetails.address.country}</div>
                  )}
                </div>
              )}
              {/* Expanded profile object if present */}
              {userDetails?.profile && typeof userDetails.profile === 'object' && (
                <div className="bg-gray-50 rounded p-2 mt-2">
                  <div className="font-semibold text-gray-800 mb-1">Profile Details:</div>
                  {Object.entries(userDetails.profile).map(([pkey, pval]) => {
                    if (pkey === 'address' && typeof pval === 'object' && pval !== null) {
                      const addr: any = pval;
                      return (
                        <div key={pkey} className="pl-2 mt-1">
                          <div className="font-semibold text-xs text-gray-700">Address:</div>
                          {addr.line1 && (
                            <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Address Line 1:</span> {addr.line1}</div>
                          )}
                          {addr.line2 && (
                            <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Address Line 2:</span> {addr.line2}</div>
                          )}
                          {addr.city && (
                            <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">City:</span> {addr.city}</div>
                          )}
                          {addr.county && (
                            <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">County:</span> {addr.county}</div>
                          )}
                          {addr.postcode && (
                            <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Postcode:</span> {addr.postcode}</div>
                          )}
                          {addr.country && (
                            <div className="text-xs text-gray-700 pl-2"><span className="font-semibold">Country:</span> {addr.country}</div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={pkey} className="text-xs text-gray-700 pl-2"><span className="font-semibold">{pkey}:</span> {typeof pval === 'object' ? JSON.stringify(pval) : String(pval)}</div>
                    );
                  })}
                </div>
              )}
              {userDetails?.profileCompleteness !== undefined && (
                <div><span className="font-semibold">Profile Completeness:</span> {userDetails.profileCompleteness}%</div>
              )}
              {interest.date && <div><span className="font-semibold">Registered Interest:</span> {formatDateTime(interest.date)}</div>}
              {/* Show all other user fields except password/hash and createdAt */}
              {userDetails && Object.entries(userDetails).map(([key, value]) => (
                ["_id", "name", "email", "phone", "role", "address", "profileCompleteness", "createdAt", "hashedPassword", "password", "profile"].includes(key)
                  ? null
                  : (
                    <div key={key} className="text-xs text-gray-500"><span className="font-semibold">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                  )
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {onMessage && (
              <button
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
                onClick={() => onMessage(interest.applicantId)}
              >
                Start Conversation
              </button>
            )}
            <button
              className="ml-auto bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </Modal>
      );
    }

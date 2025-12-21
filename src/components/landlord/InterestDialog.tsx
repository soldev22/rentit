"use client";
import { useState } from "react";
import Modal from "@/components/admin/AdminModal";

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
  if (!open) return null;
  return (
    <Modal onClose={onClose} title="Applicant Details">
      <div className="p-4 min-w-[320px]">
        {/* <h2 className="text-lg font-semibold mb-2">Applicant Details</h2> */}
        <div className="mb-2">
          <div className="font-semibold">{interest.applicantName}</div>
          <div className="text-xs text-gray-700">Email: {interest.applicantEmail}</div>
          {interest.applicantTel && <div className="text-xs text-gray-700">Tel: {interest.applicantTel}</div>}
          {interest.date && <div className="text-xs text-gray-500">Registered: {new Date(interest.date).toLocaleString()}</div>}
        </div>
        <div className="flex gap-2 mt-4">
          {onEditUser && (
            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              onClick={() => onEditUser(interest.applicantId)}
            >
              Edit User
            </button>
          )}
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
      </div>
    </Modal>
  );
}

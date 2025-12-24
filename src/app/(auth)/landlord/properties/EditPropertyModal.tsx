
"use client";
import { useState } from "react";
import InterestDialog from "@/components/landlord/InterestDialog";
import ManageUserModal from "@/components/landlord/ManageUserModal";
import PropertyImageUpload from "./PropertyImageUpload";
import ImageDeleteModal from "./ImageDeleteModal";
import Image from 'next/image';
import { formatDateTime } from '../../../../lib/formatDate';

// ...existing code...

// ...existing code...

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  description?: string;
  deposit?: number;
  amenities?: string[];
  virtualTourUrl?: string;
  viewingInstructions?: string;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  photos?: { url: string; blobName: string }[];
  interests?: {
    applicantId: string;
    applicantName: string;
    applicantEmail: string;
    applicantTel?: string;
    date?: string;
  }[];
};

type PropertyUpdatePayload = {
  title: string;
  status: string;
  rentPcm: number;
  description?: string;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
  deposit?: number;
  amenities?: string[];
  viewingInstructions?: string;
  virtualTourUrl?: string;
};

export default function EditPropertyModal({
  property,
  onClose,
}: {
  property: Property;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(property.title);
  const [line1, setLine1] = useState(property.address?.line1 ?? "");
  const [city, setCity] = useState(property.address?.city ?? "");
  const [postcode, setPostcode] = useState(property.address?.postcode ?? "");
  const [rentPcm, setRentPcm] = useState(property.rentPcm);
  const [status, setStatus] = useState(property.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(property.description || "");
  const [photos, setPhotos] = useState(property.photos || []);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [interestDialogIdx, setInterestDialogIdx] = useState<number | null>(null);

  // New fields
  const [deposit, setDeposit] = useState<number | undefined>(property.deposit ?? undefined);
  const [amenities, setAmenities] = useState<string[]>(property.amenities || []);
  const [virtualTourUrl, setVirtualTourUrl] = useState(property.virtualTourUrl || '');
  const [viewingInstructions, setViewingInstructions] = useState(property.viewingInstructions || '');

  function toggleArrayValue(arr: string[], set: (v: string[]) => void, value: string) {
    if (arr.includes(value)) set(arr.filter((a) => a !== value));
    else set([...arr, value]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Helper that performs the PUT and returns the Response
    async function doPut() {
      // Trim optional fields to avoid sending empty strings
            const payload: PropertyUpdatePayload = {
              title,
              status,
              rentPcm,
              description,
              address: {
                line1,
                city,
                postcode,
              },
              deposit,
              amenities,
              viewingInstructions,
            };
            if (virtualTourUrl && String(virtualTourUrl).trim() !== '') payload.virtualTourUrl = String(virtualTourUrl).trim();

      return await fetch(`/api/landlord/properties/${property._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    try {
      const maxAttempts = 3;
      let attempt = 0;
      let res: Response | null = null;
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          res = await doPut();
          // If server error (5xx), treat as retryable
          if (res.status >= 500 && attempt < maxAttempts) {
            console.warn(`handleSave attempt ${attempt} received ${res.status}, retrying...`);
            await new Promise((r) => setTimeout(r, 500 * attempt));
            continue;
          }
          break; // success (got a response) or client/validation error
        } catch (err) {
          console.warn(`handleSave attempt ${attempt} failed:`, err);
          if (attempt < maxAttempts) {
            // small exponential backoff before retrying
            await new Promise((r) => setTimeout(r, 400 * attempt));
            continue;
          }
          throw err; // rethrow after final attempt
        }
      }

      if (!res) throw new Error('No response from server');

      // Try to parse body safely
      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch (e) {
        console.warn('Could not parse JSON response from save', e);
      }

      console.log('Save response status:', res.status, 'body:', data);
      if (!res.ok || data?.error) {
        // prefer server error message when available
        const serverMsgRaw = data?.error ?? data?.message ?? null;
        const serverMsg = typeof serverMsgRaw === 'string' ? serverMsgRaw : (serverMsgRaw ? JSON.stringify(serverMsgRaw) : null);
        // If schema validation details are present, show them
        if (data?.details) {
          // details is typically { field: ['msg'] } or flattened; stringify for now
          setError(`${serverMsg || 'Validation error'}: ${JSON.stringify(data.details)}`);
        } else {
          setError(serverMsg || `Failed to save property (status ${res.status})`);
        }
      } else {
        setError(null);
        onClose();
        window.location.reload();
      }
    } catch (err: unknown) {
      console.error('handleSave error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to save property");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/landlord/properties/${property._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete property");
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err) {
      console.error('delete property error:', err);
      setError("Failed to delete property");
    } finally {
      setSaving(false);
    }
  }
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Edit Property</h2>

        {/* Property Images */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Property Images (max 20)</label>
          <div className="flex flex-row gap-2 mb-2">
            {photos.map((photo, idx) => (
              // Use Next.js Image for better optimization
              <Image key={idx} src={photo.url} alt={`Property photo ${idx + 1}`} width={40} height={40} className="rounded-sm border border-gray-200 cursor-pointer" onClick={() => setDeleteIdx(idx)} />
            ))}
            {photos.length === 0 && <span className="text-xs text-gray-400">No images yet</span>}
          </div>
          <ImageDeleteModal
            open={deleteIdx !== null}
            onClose={() => setDeleteIdx(null)}
            onDelete={async () => {
              if (deleteIdx !== null) {
                const photo = photos[deleteIdx];
                try {
                  const res = await fetch(`/api/properties/${property._id}/delete-photo`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blobName: photo.blobName }),
                  });
                  if (!res.ok) throw new Error("Failed to delete image");
                  setPhotos((prev) => prev.filter((_, i) => i !== deleteIdx));
                  setDeleteIdx(null);
                } catch (err) {
                  console.error('delete photo error:', err);
                  alert("Failed to delete image");
                }
              }
            }}
          />
          {photos.length < 20 && (
            <PropertyImageUpload
              propertyId={property._id}
              onUploaded={(photo) => setPhotos((prev) => [...prev, photo])}
            />
          )}
        </div>

        {/* Registered Interests */}
        {property.interests && property.interests.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Registered Interests</label>
            <div className="bg-gray-50 rounded p-2 max-h-40 overflow-y-auto border">
              {property.interests.map((interest, idx) => (
                <div
                  key={idx}
                  className="mb-2 pb-2 border-b last:border-b-0 last:mb-0 last:pb-0 cursor-pointer hover:bg-indigo-50 rounded"
                  onClick={() => setInterestDialogIdx(idx)}
                >
                  <div className="font-semibold text-indigo-700">{interest.applicantName}</div>
                  <div className="text-xs text-gray-700">Email: {interest.applicantEmail}</div>
                  {interest.applicantTel && <div className="text-xs text-gray-700">Tel: {interest.applicantTel}</div>}
                  {interest.date && <div className="text-xs text-gray-500">{formatDateTime(interest.date)}</div>}
                </div>
              ))}
            </div>
            <button
              className="mt-2 rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete all registered interests for this property?')) return;
                setSaving(true);
                setError(null);
                try {
                  const res = await fetch(`/api/landlord/properties/${property._id}/interests`, {
                    method: 'DELETE',
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || 'Failed to delete interests');
                  } else {
                    window.location.reload();
                  }
                } catch (err) {                  console.error('delete interests error:', err);                  setError('Failed to delete interests');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              Delete all interests
            </button>
          </div>
        )}

        {/* InterestDialog modal for selected interest */}
        {interestDialogIdx !== null && property.interests && property.interests[interestDialogIdx] && (
          <InterestDialog
            open={true}
            onClose={() => setInterestDialogIdx(null)}
            interest={property.interests[interestDialogIdx]}
          />
        )}

        {/* ManageUserModal for editing applicant */}
        {/* Always render ManageUserModal at the top level for z-index/modal stacking */}
            {/* ManageUserModal for editing applicant (rendered when editUserId set) */}
        {editUserId && (
          <ManageUserModal userId={editUserId} onClose={() => setEditUserId(null)} />
        )}

        {/* Title */}
        <div className="mb-3">
          <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
          <input
            id="title"
            placeholder="Enter a short title for the property"
            className="w-full rounded-md border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-required="true"
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            className="w-full rounded-md border px-3 py-2 min-h-[60px] resize-vertical"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter a description for this property..."
          />
        </div>

        {/* Address */}
        <div className="mb-3">
          <label htmlFor="address-line1" className="block text-sm font-medium mb-1">Address line</label>
          <input
            id="address-line1"
            placeholder="Street address or building name"
            className="w-full rounded-md border px-3 py-2"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">City</label>
            <input
              id="city"
              placeholder="City"
              className="w-full rounded-md border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium mb-1">Postcode</label>
            <input
              id="postcode"
              placeholder="Postcode"
              className="w-full rounded-md border px-3 py-2"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>
        </div>

        {/* Rent */}
        <div className="mb-3">
          <label htmlFor="rent-pcm" className="block text-sm font-medium mb-1">Rent (pcm)</label>
          <input
            id="rent-pcm"
            aria-label="Rent"
            type="number"
            min={0}
            placeholder="Monthly rent in GBP"
            className="w-full rounded-md border px-3 py-2"
            value={rentPcm}
            onChange={(e) => setRentPcm(Number(e.target.value))}
          />
        </div>

        {/* Deposit */}
        <div className="mb-3">
          <label htmlFor="deposit" className="block text-sm font-medium mb-1">Deposit (GBP)</label>
          <input
            id="deposit"
            aria-label="Deposit"
            type="number"
            min={0}
            placeholder="Deposit amount"
            className="w-full rounded-md border px-3 py-2"
            value={deposit ?? ''}
            onChange={(e) => setDeposit(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        {/* Amenities (checkboxes) */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Amenities</label>
          <div className="flex flex-wrap gap-3">
            {['garden','balcony','dishwasher','washing_machine','lift','communal','parking','concierge'].map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input aria-label={`amenity-${a}`} type="checkbox" checked={amenities.includes(a)} onChange={() => toggleArrayValue(amenities, setAmenities, a)} />
                <span className="capitalize">{a.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Virtual tour */}
        <div className="mb-3">
          <label htmlFor="virtual-tour" className="block text-sm font-medium mb-1">Virtual tour URL</label>
          <input
            id="virtual-tour"
            aria-label="Virtual tour URL"
            placeholder="https://example.com/tour"
            className="w-full rounded-md border px-3 py-2"
            value={virtualTourUrl}
            onChange={(e) => setVirtualTourUrl(e.target.value)}
          />
        </div>

        {/* Viewing instructions */}
        <div className="mb-3">
          <label htmlFor="viewing-instructions" className="block text-sm font-medium mb-1">Viewing instructions</label>
          <textarea
            id="viewing-instructions"
            aria-label="Viewing instructions"
            className="w-full rounded-md border px-3 py-2 min-h-[60px] resize-vertical"
            value={viewingInstructions}
            onChange={e => setViewingInstructions(e.target.value)}
            placeholder="Add any viewing instructions or notes for viewers"
          />
        </div>

        {/* Status */}
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
          <select
            id="status"
            className="w-full rounded-md border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="listed">Listed</option>
            <option value="paused">Paused</option>
            <option value="let">Let</option>
            <option value="breached">Breached</option>
          </select>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center gap-3 mt-4">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#6b4eff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>

  );
}

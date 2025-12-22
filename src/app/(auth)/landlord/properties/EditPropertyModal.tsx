
"use client";
import { useState } from "react";
import InterestDialog from "@/components/landlord/InterestDialog";
import ManageUserModal from "@/components/landlord/ManageUserModal";
import PropertyImageUpload from "./PropertyImageUpload";
import ImageDeleteModal from "./ImageDeleteModal";

// ...existing code...

// ...existing code...

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  description?: string;
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

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/landlord/properties/${property._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          rentPcm,
          description,
          address: {
            line1,
            city,
            postcode,
          },
        }),
      });
      const data = await res.json();
      console.log('Save response status:', res.status, 'body:', data);
      if (!res.ok || data?.error) {
        // show explicit status to help debugging
        setError(data?.error || `Failed to save property (status ${res.status})`);
      } else {
        setError(null);
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      console.error('handleSave error:', err);
      setError(err?.message || "Failed to save property");
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
              <img
                key={idx}
                src={photo.url}
                alt={`Property photo ${idx + 1}`}
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer' }}
                onClick={() => setDeleteIdx(idx)}
              />
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
                  {interest.date && <div className="text-xs text-gray-500">{new Date(interest.date).toLocaleString()}</div>}
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
                } catch (err) {
                  setError('Failed to delete interests');
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
        {editUserId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ background: 'white', padding: 32, borderRadius: 12, minWidth: 320, textAlign: 'center' }}>
              <h2 style={{ marginBottom: 16 }}>Test Modal</h2>
              <div>User ID: {editUserId}</div>
              <button style={{ marginTop: 24 }} onClick={() => setEditUserId(null)}>Close</button>
            </div>
          </div>
        )}

        {/* ManageUserModal for editing applicant */}
        {editUserId && (
          <ManageUserModal userId={editUserId} onClose={() => setEditUserId(null)} />
        )}

        {/* Title */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 min-h-[60px] resize-vertical"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter a description for this property..."
          />
        </div>

        {/* Address */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Address line</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postcode</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>
        </div>

        {/* Rent */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Rent (pcm)</label>
          <input
            type="number"
            className="w-full rounded-md border px-3 py-2"
            value={rentPcm}
            onChange={(e) => setRentPcm(Number(e.target.value))}
          />
        </div>

        {/* Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
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

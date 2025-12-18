"use client";

import { useState } from "react";

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  address: {
    line1?: string;
    city?: string;
    postcode?: string;
  };
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
          address: {
            line1,
            city,
            postcode,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save property");
      }

      onClose();
      window.location.reload(); // simple + reliable for now
    } catch (err) {
      setError("Something went wrong saving the property");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          Edit Property
        </h2>

        {/* Title */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Address */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">
            Address line
          </label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              City
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Postcode
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </div>
        </div>

        {/* Rent */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">
            Rent (pcm)
          </label>
          <input
            type="number"
            className="w-full rounded-md border px-3 py-2"
            value={rentPcm}
            onChange={(e) => setRentPcm(Number(e.target.value))}
          />
        </div>

        {/* Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Status
          </label>
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
          <p className="mb-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
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
  );
}

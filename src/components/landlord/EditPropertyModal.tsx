"use client";

import { useState } from "react";
import Image from "next/image";
import InterestDialog from "@/components/landlord/InterestDialog";
import { formatDateTime } from "@/lib/formatDate";
import PropertyMediaPanel from "@/components/landlord/Property/PropertyMediaPanel";

/* ---------- TYPES ---------- */

type Photo = {
  url: string;
  blobName: string;
  isHero?: boolean;
};

type Property = {
  _id: string;
  title: string;
  status: string;
  rentPcm: number;
  rentPeriod?: "PCM" | "4 weeks";
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
  photos?: Photo[];
  furnished?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  tenancyLengthMonths?: number;
  billsIncluded?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  epcRating?: string;
  councilTaxBand?: string;
  parking?: string;
  floor?: string;
  hmoLicenseRequired?: boolean;
  interests?: {
    applicantId: string;
    applicantName: string;
    applicantEmail: string;
    applicantTel?: string;
    date?: string;
  }[];
};

/* ---------- COMPONENT ---------- */

export default function EditPropertyModal({
  property,
  onClose,
}: {
  property: Property;
  onClose: () => void;
}) {
  const initialPhotos = (property.photos ?? []).map((p) => ({
    url: p.url,
    blobName: p.blobName,
    isHero: p.isHero,
  }));

  const [form, setForm] = useState({
    title: property.title,
    description: property.description ?? "",
    line1: property.address?.line1 ?? "",
    city: property.address?.city ?? "",
    postcode: property.address?.postcode ?? "",
    rentPcm: String(property.rentPcm),
    rentPeriod: property.rentPeriod ?? "PCM",
    deposit: property.deposit ? String(property.deposit) : "",
    status: property.status,
    amenities: property.amenities ?? [],
    virtualTourUrl: property.virtualTourUrl ?? "",
    viewingInstructions: property.viewingInstructions ?? "",
    furnished: property.furnished ?? false,
    bedrooms: property.bedrooms ? String(property.bedrooms) : "",
    bathrooms: property.bathrooms ? String(property.bathrooms) : "",
    sizeSqm: property.sizeSqm ? String(property.sizeSqm) : "",
    tenancyLengthMonths: property.tenancyLengthMonths ? String(property.tenancyLengthMonths) : "",
    billsIncluded: property.billsIncluded ?? [],
    petsAllowed: property.petsAllowed ?? false,
    smokingAllowed: property.smokingAllowed ?? false,
    epcRating: property.epcRating ?? "",
    councilTaxBand: property.councilTaxBand ?? "",
    parking: property.parking ?? "",
    floor: property.floor ?? "",
    hmoLicenseRequired: property.hmoLicenseRequired ?? false,
  });

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [interestIdx, setInterestIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // New state for delete confirmation

  // Add this function to preserve isHero when photos are updated
  function updatePhotos(newPhotos: Photo[]) {
    const updated = newPhotos.map((p) => {
      const existing = photos.find((ep) => ep.blobName === p.blobName);
      return { ...p, isHero: existing?.isHero || false };
    });
    setPhotos(updated);
  }

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmenity(value: string) {
    update(
      "amenities",
      form.amenities.includes(value)
        ? form.amenities.filter((a) => a !== value)
        : [...form.amenities, value]
    );
  }

  function toggleBill(value: string) {
    update(
      "billsIncluded",
      form.billsIncluded.includes(value)
        ? form.billsIncluded.filter((a) => a !== value)
        : [...form.billsIncluded, value]
    );
  }

  function setHero(index: number) {
    setPhotos((prev) =>
      prev.map((p, i) => ({ ...p, isHero: i === index }))
    );
  }

// ... existing code ...

// ... existing code ...

// ... existing code ...

async function handleSave() {
  setSaving(true);
  setError(null);

  const bodyData = {
    title: form.title,
    description: form.description,
    rentPcm: Number(form.rentPcm),
    rentPeriod: form.rentPeriod,
    deposit: form.deposit ? Number(form.deposit) : undefined,
    status: form.status,
    amenities: form.amenities,
    virtualTourUrl: form.virtualTourUrl || undefined,
    viewingInstructions: form.viewingInstructions || undefined,
    address: {
      line1: form.line1,
      city: form.city,
      postcode: form.postcode,
    },
    // Do not include photos here to avoid wiping them
    furnished: form.furnished,
    bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
    bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
    sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : undefined,
    tenancyLengthMonths: form.tenancyLengthMonths ? Number(form.tenancyLengthMonths) : undefined,
    billsIncluded: form.billsIncluded,
    petsAllowed: form.petsAllowed,
    smokingAllowed: form.smokingAllowed,
    epcRating: form.epcRating || undefined,
    councilTaxBand: form.councilTaxBand || undefined,
    parking: form.parking || undefined,
    floor: form.floor || undefined,
    hmoLicenseRequired: form.hmoLicenseRequired,
  };

  try {
    const res = await fetch(`/api/landlord/properties/${property._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    if (!res.ok) {
      let errorMessage = "Failed to save property";
      try {
        const data = await res.json();
        errorMessage = data.error || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    onClose();  // Close the modal instead of reloading the page
      window.location.reload();  // Refresh the page to immediately show updated hero in the grid
  
  } catch (err) {
    setError(err instanceof Error ? err.message : "Save failed");
  } finally {
    setSaving(false);
  }
}

// ... existing code ...

// ... existing code ...

// ... existing code ...
  async function confirmDelete() {
    await fetch(`/api/landlord/properties/${property._id}`, {
      method: "DELETE",
    });
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg max-h-[90vh] flex flex-col">
        <h2 className="px-6 pt-6 text-lg font-semibold">Edit Property</h2>

        {/* SCROLL AREA */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <PropertyMediaPanel
                propertyId={property._id}
                initialPhotos={initialPhotos}
                onChange={updatePhotos}  // Changed from setPhotos to updatePhotos
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Property Images
                </label>
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <Image
                        src={p.url}
                        alt={`Property image ${i + 1}`}
                        width={48}
                        height={48}
                        className="border rounded"
                      />
                      <label className="text-xs mt-1">
                        <input
                          type="radio"
                          name="hero"
                          checked={p.isHero || false}
                          onChange={() => setHero(i)}
                        />
                        Hero
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {property.interests?.length ? (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Registered Interests
                  </label>
                  <div className="border rounded p-2 max-h-40 overflow-y-auto">
                    {property.interests.map((i, idx) => (
                      <div
                        key={idx}
                        className="text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                        onClick={() => setInterestIdx(idx)}
                      >
                        <strong>{i.applicantName}</strong>
                        <div>{i.applicantEmail}</div>
                        {i.date && (
                          <div className="text-xs text-gray-500">
                            {formatDateTime(i.date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <Input
                id="title"
                label="Title"
                value={form.title}
                onChange={(v) => update("title", v)}
              />

              <Textarea
                id="description"
                label="Description"
                value={form.description}
                onChange={(v) => update("description", v)}
              />

              <Input
                id="line1"
                label="Address line"
                value={form.line1}
                onChange={(v) => update("line1", v)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="city"
                  label="City"
                  value={form.city}
                  onChange={(v) => update("city", v)}
                />
                <Input
                  id="postcode"
                  label="Postcode"
                  value={form.postcode}
                  onChange={(v) => update("postcode", v)}
                />
              </div>

              <Input
                id="rent"
                label="Rent Amount"
                type="number"
                value={form.rentPcm}
                onChange={(v) => update("rentPcm", v)}
              />

              <Select
                id="rentPeriod"
                label="Rent Period"
                value={form.rentPeriod}
                onChange={(v) => update("rentPeriod", v as "PCM" | "4 weeks")}
                options={["PCM", "4 weeks"]}
              />

              <Input
                id="deposit"
                label="Deposit (GBP)"
                type="number"
                value={form.deposit}
                onChange={(v) => update("deposit", v)}
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Amenities
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    "garden",
                    "balcony",
                    "dishwasher",
                    "parking",
                    "lift",
                    "communal",
                    "concierge",
                    "washing_machine",
                  ].map((a) => (
                    <label key={a} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        title={a}
                        checked={form.amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                      />
                      {a.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </div>

              <Input
                id="tour"
                label="Virtual tour URL"
                value={form.virtualTourUrl}
                onChange={(v) => update("virtualTourUrl", v)}
              />

              <Textarea
                id="viewing"
                label="Viewing instructions"
                value={form.viewingInstructions}
                onChange={(v) => update("viewingInstructions", v)}
              />

              
              <div>
                <Select
                  id="furnished"
                  label="Furnished"
                  value={form.furnished ? "true" : "false"}
                  onChange={(v) => update("furnished", v === "true")}
                  options={["true", "false"]}
                />
              </div>

              <Input
                id="bedrooms"
                label="Bedrooms"
                type="number"
                value={form.bedrooms}
                onChange={(v) => update("bedrooms", v)}
              />

              <Input
                id="bathrooms"
                label="Bathrooms"
                type="number"
                value={form.bathrooms}
                onChange={(v) => update("bathrooms", v)}
              />

              <Input
                id="sizeSqm"
                label="Size (sqm)"
                type="number"
                value={form.sizeSqm}
                onChange={(v) => update("sizeSqm", v)}
              />

              <Input
                id="tenancyLengthMonths"
                label="Tenancy Length (months)"
                type="number"
                value={form.tenancyLengthMonths}
                onChange={(v) => update("tenancyLengthMonths", v)}
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Bills Included
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    "electricity",
                    "gas",
                    "water",
                    "internet",
                    "council_tax",
                  ].map((b) => (
                    <label key={b} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        title={b}
                        checked={form.billsIncluded.includes(b)}
                        onChange={() => toggleBill(b)}
                      />
                      {b.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="petsAllowed"
                  checked={form.petsAllowed}
                  onChange={(e) => update("petsAllowed", e.target.checked)}
                />
                <label htmlFor="petsAllowed" className="text-sm font-medium">
                  Pets Allowed
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smokingAllowed"
                  checked={form.smokingAllowed}
                  onChange={(e) => update("smokingAllowed", e.target.checked)}
                />
                <label htmlFor="smokingAllowed" className="text-sm font-medium">
                  Smoking Allowed
                </label>
              </div>

              <Select
                id="epcRating"
                label="EPC Rating"
                value={form.epcRating}
                onChange={(v) => update("epcRating", v)}
                options={["A", "B", "C", "D", "E", "F", "G"]}
              />

              <Select
                id="councilTaxBand"
                label="Council Tax Band"
                value={form.councilTaxBand}
                onChange={(v) => update("councilTaxBand", v)}
                options={["A", "B", "C", "D", "E", "F", "G", "H"]}
              />

              <Select
                id="parking"
                label="Parking"
                value={form.parking}
                onChange={(v) => update("parking", v)}
                options={['None','On-street','Off-street','Garage','Driveway','Permit','Other']}
              />

              <Input
                id="floor"
                label="Floor"
                value={form.floor}
                onChange={(v) => update("floor", v)}
              />

              <Select
                id="status"
                label="Status"
                value={form.status}
                onChange={(v) => update("status", v)}
                options={["draft", "listed", "paused", "let", "breached"]}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hmoLicenseRequired"
                  checked={form.hmoLicenseRequired}
                  onChange={(e) => update("hmoLicenseRequired", e.target.checked)}
                />
                <label htmlFor="hmoLicenseRequired" className="text-sm font-medium">
                  HMO License Required
                </label>
              </div>
            </div>
          </div>

          {error && <p className="text-red-600 mt-4">{error}</p>}
        </div>

        {/* ACTIONS */}
        <div className="px-6 py-4 border-t flex justify-between bg-white">
          <button
            onClick={() => setShowDeleteConfirm(true)} // Trigger confirmation modal
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button onClick={onClose}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this property? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {interestIdx !== null && property.interests && (
        <InterestDialog
          open
          interest={property.interests[interestIdx]}
          propertyId={property._id}
          onClose={() => setInterestIdx(null)}
        />
      )}
    </div>
  );
}

/* ---------- FIELD HELPERS ---------- */

function Input({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={id}
        title={label}
        placeholder={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />
    </div>
  );
}

function Textarea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <textarea
        id={id}
        title={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 min-h-[80px]"
      />
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <select
        id={id}
        title={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
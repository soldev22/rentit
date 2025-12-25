"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PropertyMediaPanel from "@/components/landlord/Property/PropertyMediaPanel";

/* ---------- TYPES ---------- */

type Photo = {
  url: string;
  blobName: string;
  isHero?: boolean;
};

/* ---------- COMPONENT ---------- */

export default function CreatePropertyForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    line1: "",
    city: "",
    postcode: "",
    rentPcm: "",
    rentPeriod: "PCM" as "PCM" | "4 weeks",
    deposit: "",
    status: "draft" as "draft" | "listed" | "paused" | "let" | "breached",
    amenities: [] as string[],
    virtualTourUrl: "",
    viewingInstructions: "",
    furnished: false,
    bedrooms: "",
    bathrooms: "",
    sizeSqm: "",
    tenancyLengthMonths: "",
    billsIncluded: [] as string[],
    petsAllowed: false,
    smokingAllowed: false,
    epcRating: "",
    councilTaxBand: "",
    parking: "",
    floor: "",
    hmoLicenseRequired: false,
  });

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const bodyData = {
      title: form.title,
      description: form.description || undefined,
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
      photos: photos,  // Include photos for creation
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
      const res = await fetch("/api/landlord/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        let errorMessage = "Failed to create property";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      router.push("/landlord/properties");  // Redirect to properties list after creation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <PropertyMediaPanel
            propertyId=""  // For creation, no existing property ID
            initialPhotos={[]}
            onChange={setPhotos}
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
                      onChange={() => {
                        setPhotos((prev) =>
                          prev.map((photo, idx) => ({ ...photo, isHero: idx === i }))
                        );
                      }}
                    />
                    Hero
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <Input
            id="title"
            label="Title"
            value={form.title}
            onChange={(v) => update("title", v)}
            required
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
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="city"
              label="City"
              value={form.city}
              onChange={(v) => update("city", v)}
              required
            />
            <Input
              id="postcode"
              label="Postcode"
              value={form.postcode}
              onChange={(v) => update("postcode", v)}
              required
            />
          </div>

          <Input
            id="rent"
            label="Rent Amount"
            type="number"
            value={form.rentPcm}
            onChange={(v) => update("rentPcm", v)}
            required
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

          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(v) => update("status", v)}
            options={["draft", "listed", "paused", "let", "breached"]}
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

      {error && <p className="text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Creating…" : "Create Property"}
        </button>
      </div>
    </form>
  );
}

/* ---------- FIELD HELPERS ---------- */

function Input({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
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
        required={required}
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
"use client";

import { useState } from "react";
import InterestDialog from "@/components/landlord/InterestDialog";
import { formatDateTime } from "@/lib/formatDate";

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


export default function EditPropertyModal({
  property,
  onClose,
}: {
  property: Property;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: property.title,
    description: property.description ?? "",
    line1: property.address?.line1 ?? "",
    city: property.address?.city ?? "",
    postcode: property.address?.postcode ?? "",
    rentPcm: property.rentPcm,
    deposit: property.deposit ?? "",
    status: property.status,
amenities: property.amenities ? [...property.amenities] : [],
    virtualTourUrl: property.virtualTourUrl ?? "",
    viewingInstructions: property.viewingInstructions ?? "",
  });


  const [interestIdx, setInterestIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
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

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/landlord/properties/${property._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          rentPcm: Number(form.rentPcm),
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save property");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this property permanently?")) return;
    await fetch(`/api/landlord/properties/${property._id}`, { method: "DELETE" });
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
              <div>
                <label className="block text-sm font-medium mb-1">
                  Property Images
                </label>
                
        
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
              <Input id="title" label="Title" value={form.title}
                onChange={(v : string) => update("title", v)} />

              <Textarea id="description" label="Description"
                value={form.description}
                onChange={(v:string) => update("description", v)} />

              <Input id="line1" label="Address line"
                value={form.line1}
                onChange={(v: string) => update("line1", v)} />

              <div className="grid grid-cols-2 gap-3">
                <Input id="city" label="City"
                  value={form.city}
                  onChange={(v: string) => update("city", v)} />
                <Input id="postcode" label="Postcode"
                  value={form.postcode}
                  onChange={(v: string) => update("postcode", v)} />
              </div>

              <Input id="rent" label="Rent (pcm)" type="number"
                value={String(form.rentPcm)}
                onChange={(v: string) => update("rentPcm", Number(v))} />

              <Input id="deposit" label="Deposit (GBP)" type="number"
                value={String(form.deposit)}
                onChange={(v:string) => update("deposit", v)} />

              <div>
                <label className="block text-sm font-medium mb-1">Amenities</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {["garden","balcony","dishwasher","parking","lift","communal","concierge","washing_machine"].map(a => (
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

              <Input id="tour" label="Virtual tour URL"
                value={form.virtualTourUrl}
                onChange={(v: string) => update("virtualTourUrl", v)} />

              <Textarea id="viewing" label="Viewing instructions"
                value={form.viewingInstructions}
                onChange={(v: string) => update("viewingInstructions", v)} />
              <Select
                id="status"
                label="Status"
                value={form.status}
                onChange={(v: string) => update("status", v)}
                options={["draft","listed","paused","let","breached"]}
              />

            </div>
          </div>

          {error && <p className="text-red-600 mt-4">{error}</p>}
        </div>

        {/* ACTIONS */}
        <div className="px-6 py-4 border-t flex justify-between bg-white">
          <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded">
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

/* ---------- SMALL FIELD HELPERS ---------- */

interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

interface TextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}

interface SelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

function Input({
  id,
  label,
  value,
  onChange,
  type = "text",
}: InputProps) {
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

function Textarea({ id, label, value, onChange }: TextareaProps) {
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

function Select({ id, label, value, onChange, options }: SelectProps) {
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
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

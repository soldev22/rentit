
"use client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem",
  marginTop: "0.3rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "0.95rem",
};

import { useState } from "react";
import { useRouter } from "next/navigation";

type Photo = { url: string; blobName: string };

export default function NewPropertyPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [rentPcm, setRentPcm] = useState("");
  const [rentFrequency, setRentFrequency] = useState("pcm");
  const [propertyType, setPropertyType] = useState("flat");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [furnished, setFurnished] = useState("unknown");
  const [deposit, setDeposit] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [tenancyLengthMonths, setTenancyLengthMonths] = useState(12);
  const [billsIncluded, setBillsIncluded] = useState<string[]>([]);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [epcRating, setEpcRating] = useState("unknown");
  const [councilTaxBand, setCouncilTaxBand] = useState("unknown");
  const [sizeSqm, setSizeSqm] = useState("");
  const [parking, setParking] = useState("none");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [virtualTourUrl, setVirtualTourUrl] = useState("");
  const [floor, setFloor] = useState("");
  const [hmoLicenseRequired, setHmoLicenseRequired] = useState(false);
  const [viewingInstructions, setViewingInstructions] = useState("");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleArrayValue(arr: string[], set: (v: string[]) => void, value: string) {
    if (arr.includes(value)) set(arr.filter((a) => a !== value));
    else set([...arr, value]);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const max = 20;
    const fileArr = Array.from(files).slice(0, max - photos.length);

    const uploaded: Photo[] = [];

    await Promise.all(
      fileArr.map(async (file, i) => {
        try {
          const form = new FormData();
          form.append("file", file, file.name);

          const res = await fetch("/api/landlord/properties/upload-photo", {
            method: "POST",
            body: form,
          });

          if (res.ok) {
            const data = await res.json();
            uploaded.push({ url: data.url, blobName: data.blobName });
            return;
          }
        } catch (e) {
          // fallthrough to fallback
        }

        // fallback: read as data URL
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            uploaded.push({ url: String(reader.result), blobName: `inline-${Date.now()}-${i}` });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setPhotos((p) => [...p, ...uploaded].slice(0, max));
  }

  function removePhoto(index: number) {
    setPhotos((p) => p.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body = {
      title,
      headline,
      description,
      address: { line1, line2, city, postcode },
      rentPcm: Number(rentPcm),
      rentFrequency,
      propertyType,
      bedrooms,
      bathrooms,
      furnished,
      deposit: deposit ? Number(deposit) : undefined,
      availabilityDate: availabilityDate || undefined,
      tenancyLengthMonths,
      billsIncluded,
      petsAllowed,
      smokingAllowed,
      epcRating,
      councilTaxBand,
      sizeSqm: sizeSqm ? Number(sizeSqm) : undefined,
      parking,
      amenities,
      virtualTourUrl: virtualTourUrl || undefined,
      floor,
      hmoLicenseRequired,
      viewingInstructions,
      photos,
    };

    const res = await fetch("/api/landlord/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      // Show detailed validation information in the UI for debugging and tests
      const message = err?.error || (err?.details ? JSON.stringify(err.details, null, 2) : JSON.stringify(err));
      setError(typeof message === 'string' ? message : JSON.stringify(message));
      return;
    }

    // Clear error and navigate on success
    setError(null);
    router.push("/landlord/properties");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="mb-6">Create Property</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {error && (
          <div className="mb-3 text-red-600 whitespace-pre-wrap" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {/* Basic details */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Basic details</h2>
          <p className="text-sm text-slate-500">Add a short headline and a clear title to make your listing stand out.</p>

          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <label className="block text-sm font-medium text-slate-700">Listing headline</label>
              <input aria-label="Listing headline" id="headline" maxLength={120} placeholder="Short punchy headline" value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-slate-400 mt-1">Optional — up to 120 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input aria-label="Title" id="title" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 min-h-[120px] resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="space-y-2">
          <h3 className="text-md font-semibold">Address</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Address line 1</label>
              <input aria-label="Address line 1" id="address-line1" required value={line1} onChange={(e) => setLine1(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Address line 2</label>
              <input aria-label="Address line 2" id="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">City</label>
              <input aria-label="City" id="city" required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Postcode</label>
              <input aria-label="Postcode" id="postcode" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </section>

        {/* Pricing & basics */}
        <section className="space-y-2">
          <h3 className="text-md font-semibold">Pricing & basics</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Rent</label>
              <div className="mt-1 flex gap-2">
                <input aria-label="Rent" type="number" value={rentPcm} onChange={(e) => setRentPcm(e.target.value)} required className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select aria-label="Rent frequency" value={rentFrequency} onChange={(e) => setRentFrequency(e.target.value)} className="rounded-md border px-3 py-2">
                  <option value="pcm">pcm</option>
                  <option value="pw">pw</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deposit (GBP)</label>
              <input aria-label="Deposit" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Available from</label>
              <input aria-label="Available from" type="date" value={availabilityDate} onChange={(e) => setAvailabilityDate(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </section>

        {/* Controls & features (kept compact) */}
        <section className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Property type</label>
              <select aria-label="Property type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="flat">Flat</option>
                <option value="house">House</option>
                <option value="maisonette">Maisonette</option>
                <option value="studio">Studio</option>
                <option value="room">Room</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Bedrooms</label>
              <input aria-label="Bedrooms" type="number" value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} min={0} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Bathrooms</label>
              <input aria-label="Bathrooms" type="number" value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} min={0} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Furnished</label>
              <select aria-label="Furnished" value={furnished} onChange={(e) => setFurnished(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
                <option value="unknown">Unknown</option>
                <option value="furnished">Furnished</option>
                <option value="part-furnished">Part furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Tenancy length (months)</label>
              <input aria-label="Tenancy length" type="number" value={tenancyLengthMonths} onChange={(e) => setTenancyLengthMonths(Number(e.target.value))} min={1} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Size (sqm)</label>
              <input aria-label="Size (sqm)" type="number" value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} min={0} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </div>
          </div>
        </section>

        {/* Features & amenities */}
        <section>
          <h4 className="text-sm font-semibold mb-2">Features & amenities</h4>
          <div className="flex flex-wrap gap-3">
            {['water','gas','electricity','council_tax','internet','tv_license'].map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={billsIncluded.includes(b)} onChange={() => toggleArrayValue(billsIncluded, setBillsIncluded, b)} />
                <span className="capitalize">{b.replace('_', ' ')}</span>
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {['garden','balcony','dishwasher','washing_machine','lift','communal','parking','concierge'].map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleArrayValue(amenities, setAmenities, a)} />
                <span className="capitalize">{a.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Media */}
        <section>
          <legend id="photos-legend" className="text-sm font-semibold">Photos (max 20)</legend>
          <input id="photos" aria-label="Upload photos" aria-describedby="photos-legend" type='file' multiple accept='image/*' onChange={(e) => handleFiles(e.target.files)} className="mt-2" />

          <div className="mt-3 flex gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative w-28 h-20">
                <img src={p.url} className="w-full h-full object-cover rounded" alt={`photo-${i}`} />
                <button type='button' onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-sm">✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-4">
          <button type='button' onClick={() => router.push('/landlord/properties')} className="rounded-md border px-4 py-2">Cancel</button>
          <button type='submit' className="rounded-md bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-700">Create Draft Property</button>
        </div>

      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Photo = { url: string; blobName: string; isHero?: boolean };

export default function NewPropertyPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [rentPcm, setRentPcm] = useState("");
  const [deposit, setDeposit] = useState("");
  const [status, setStatus] = useState("draft");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [virtualTourUrl, setVirtualTourUrl] = useState("");
  const [viewingInstructions, setViewingInstructions] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [tenancyLengthMonths, setTenancyLengthMonths] = useState("");
  const [billsIncluded, setBillsIncluded] = useState<string[]>([]);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [epcRating, setEpcRating] = useState("");
  const [councilTaxBand, setCouncilTaxBand] = useState("");
  const [parking, setParking] = useState("");
  const [floor, setFloor] = useState("");
  const [hmoLicenseRequired, setHmoLicenseRequired] = useState(false);

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
            uploaded.push({ url: data.url, blobName: data.blobName, isHero: false });
            return;
          }
        } catch {
          // fallthrough to fallback
        }

        // fallback: read as data URL
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            uploaded.push({ url: String(reader.result), blobName: `inline-${Date.now()}-${i}`, isHero: false });
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

  function setHero(index: number) {
    setPhotos((prev) =>
      prev.map((p, i) => ({ ...p, isHero: i === index }))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body = {
      title,
      description: description || undefined,
      rentPcm: Number(rentPcm),
      deposit: deposit ? Number(deposit) : undefined,
      status,
      amenities,
      virtualTourUrl: virtualTourUrl || undefined,
      viewingInstructions,
      address: { line1, city, postcode },
      photos,
      furnished,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      sizeSqm: sizeSqm ? Number(sizeSqm) : undefined,
      tenancyLengthMonths: tenancyLengthMonths ? Number(tenancyLengthMonths) : undefined,
      billsIncluded,
      petsAllowed,
      smokingAllowed,
      epcRating: epcRating || undefined,
      councilTaxBand: councilTaxBand || undefined,
      parking: parking || undefined,
      floor,
      hmoLicenseRequired,
    };

    const res = await fetch("/api/landlord/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      const message = err?.error || (err?.details ? JSON.stringify(err.details, null, 2) : JSON.stringify(err));
      setError(typeof message === 'string' ? message : JSON.stringify(message));
      return;
    }

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

          <div className="grid gap-4 sm:grid-cols-1">
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
              <label className="block text-sm font-medium text-slate-700">Rent (PCM)</label>
              <input aria-label="Rent" type="number" value={rentPcm} onChange={(e) => setRentPcm(e.target.value)} required className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Deposit (GBP)</label>
              <input aria-label="Deposit" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="draft">Draft</option>
                <option value="listed">Listed</option>
                <option value="paused">Paused</option>
                <option value="let">Let</option>
                <option value="breached">Breached</option>
              </select>
            </div>
          </div>
        </section>

        {/* Controls & features */}
        <section className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Bedrooms</label>
              <input aria-label="Bedrooms" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Bathrooms</label>
              <input aria-label="Bathrooms" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Size (sqm)</label>
              <input aria-label="Size (sqm)" type="number" value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tenancy length (months)</label>
              <input aria-label="Tenancy length" type="number" value={tenancyLengthMonths} onChange={(e) => setTenancyLengthMonths(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Parking</label>
              <select aria-label="Parking" value={parking} onChange={(e) => setParking(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
                <option value="">None</option>
                <option value="On-street">On-street</option>
                <option value="Off-street">Off-street</option>
                <option value="Garage">Garage</option>
                <option value="Driveway">Driveway</option>
                <option value="Permit">Permit</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Floor</label>
              <input aria-label="Floor" value={floor} onChange={(e) => setFloor(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" />
            </div>
          </div>
        </section>

        {/* Features & amenities */}
        <section>
          <h4 className="text-sm font-semibold mb-2">Bills Included</h4>
          <div className="flex flex-wrap gap-3">
            {['electricity','gas','water','internet','council_tax'].map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={billsIncluded.includes(b)} onChange={() => toggleArrayValue(billsIncluded, setBillsIncluded, b)} />
                <span className="capitalize">{b.replace('_', ' ')}</span>
              </label>
            ))}
          </div>

          <h4 className="text-sm font-semibold mb-2 mt-4">Amenities</h4>
          <div className="grid gap-2 sm:grid-cols-4">
            {['garden','balcony','dishwasher','washing_machine','lift','communal','parking','concierge'].map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleArrayValue(amenities, setAmenities, a)} />
                <span className="capitalize">{a.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Additional fields */}
        <section className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Virtual Tour URL</label>
              <input aria-label="Virtual Tour URL" value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Viewing Instructions</label>
              <textarea aria-label="Viewing Instructions" value={viewingInstructions} onChange={(e) => setViewingInstructions(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 min-h-[80px] resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">EPC Rating</label>
              <select aria-label="EPC Rating" value={epcRating} onChange={(e) => setEpcRating(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
                <option value="">Unknown</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Council Tax Band</label>
              <select aria-label="Council Tax Band" value={councilTaxBand} onChange={(e) => setCouncilTaxBand(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2">
                <option value="">Unknown</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
                <option value="H">H</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="furnished" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} />
              <label htmlFor="furnished" className="text-sm font-medium">Furnished</label>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="petsAllowed" checked={petsAllowed} onChange={(e) => setPetsAllowed(e.target.checked)} />
              <label htmlFor="petsAllowed" className="text-sm font-medium">Pets Allowed</label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="smokingAllowed" checked={smokingAllowed} onChange={(e) => setSmokingAllowed(e.target.checked)} />
              <label htmlFor="smokingAllowed" className="text-sm font-medium">Smoking Allowed</label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="hmoLicenseRequired" checked={hmoLicenseRequired} onChange={(e) => setHmoLicenseRequired(e.target.checked)} />
              <label htmlFor="hmoLicenseRequired" className="text-sm font-medium">HMO License Required</label>
            </div>
          </div>
        </section>

        {/* Media */}
        <section className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Property Images</h3>
          <p className="text-sm text-gray-600 mb-4">Upload high-quality photos of your property (max 20). Select one as the hero image to feature prominently in listings.</p>
          <input id="photos" aria-label="Upload photos" type='file' multiple accept='image/*' onChange={(e) => handleFiles(e.target.files)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />

          <div className="mt-4 flex gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative w-28 h-20 border rounded-lg overflow-hidden">
                <Image
                  src={p.url}
                  alt={`photo-${i}`}
                  className="w-full h-full object-cover"
                  fill
                  sizes="112px"
                  style={{ objectFit: "cover" }}
                  priority={i === 0}
                />
                <button type='button' onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600">✕</button>
                <label className="absolute bottom-1 left-1 text-xs bg-white bg-opacity-75 px-1 rounded">
                  <input type="radio" name="hero" checked={p.isHero || false} onChange={() => setHero(i)} />
                  Hero
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-4">
          <button type='button' onClick={() => router.push('/landlord/properties')} className="rounded-md border px-4 py-2">Cancel</button>
          <button type='submit' className="rounded-md bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-700">Create Property</button>
        </div>

      </form>
    </div>
  );
}
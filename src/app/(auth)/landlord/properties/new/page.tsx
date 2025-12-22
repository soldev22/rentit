
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
      virtualTourUrl,
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
      alert(`Failed to create property: ${err?.error || 'unknown'}`);
      return;
    }

    router.push("/landlord/properties");
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "1.5rem" }}>Create Property</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <label>
          <strong>Listing headline</strong>
          <input
            style={inputStyle}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={120}
            placeholder="Short punchy headline"
          />
        </label>

        <label>
          <strong>Title</strong>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          <strong>Description</strong>
          <textarea
            style={{ ...inputStyle, minHeight: "100px" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <fieldset style={{ border: "none", padding: 0 }}>
          <legend style={{ fontWeight: 700 }}>Address</legend>
          <label>
            <strong>Address line 1</strong>
            <input
              style={inputStyle}
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Address line 2</strong>
            <input
              style={inputStyle}
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1 }}>
              <strong>City</strong>
              <input
                style={inputStyle}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </label>

            <label style={{ flex: 1 }}>
              <strong>Postcode</strong>
              <input
                style={inputStyle}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                required
              />
            </label>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 200px" }}>
            <strong>Rent</strong>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                style={{ ...inputStyle, flex: 1 }}
                value={rentPcm}
                onChange={(e) => setRentPcm(e.target.value)}
                required
              />
              <select
                value={rentFrequency}
                onChange={(e) => setRentFrequency(e.target.value)}
                style={{ width: 120 }}
              >
                <option value="pcm">pcm</option>
                <option value="pw">pw</option>
              </select>
            </div>
          </label>

          <label style={{ flex: "1 1 200px" }}>
            <strong>Deposit (GBP)</strong>
            <input
              type="number"
              style={inputStyle}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </label>

          <label style={{ flex: "1 1 200px" }}>
            <strong>Available from</strong>
            <input
              type="date"
              style={inputStyle}
              value={availabilityDate}
              onChange={(e) => setAvailabilityDate(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ flex: 1 }}>
            <strong>Property type</strong>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={inputStyle}
            >
              <option value="flat">Flat</option>
              <option value="house">House</option>
              <option value="maisonette">Maisonette</option>
              <option value="studio">Studio</option>
              <option value="room">Room</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label style={{ flex: 1 }}>
            <strong>Bedrooms</strong>
            <input
              type="number"
              style={inputStyle}
              value={bedrooms}
              onChange={(e) => setBedrooms(Number(e.target.value))}
              min={0}
            />
          </label>

          <label style={{ flex: 1 }}>
            <strong>Bathrooms</strong>
            <input
              type="number"
              style={inputStyle}
              value={bathrooms}
              onChange={(e) => setBathrooms(Number(e.target.value))}
              min={0}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ flex: 1 }}>
            <strong>Furnished</strong>
            <select
              value={furnished}
              onChange={(e) => setFurnished(e.target.value)}
              style={inputStyle}
            >
              <option value="unknown">Unknown</option>
              <option value="furnished">Furnished</option>
              <option value="part-furnished">Part furnished</option>
              <option value="unfurnished">Unfurnished</option>
            </select>
          </label>

          <label style={{ flex: 1 }}>
            <strong>Tenancy length (months)</strong>
            <input
              type="number"
              style={inputStyle}
              value={tenancyLengthMonths}
              onChange={(e) => setTenancyLengthMonths(Number(e.target.value))}
              min={1}
            />
          </label>

          <label style={{ flex: 1 }}>
            <strong>Size (sqm)</strong>
            <input
              type="number"
              style={inputStyle}
              value={sizeSqm}
              onChange={(e) => setSizeSqm(e.target.value)}
              min={0}
            />
          </label>
        </div>

        <fieldset style={{ border: "none", padding: 0 }}>
          <legend style={{ fontWeight: 700 }}>Features</legend>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={petsAllowed}
                onChange={(e) => setPetsAllowed(e.target.checked)}
              />
              Pets allowed
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={smokingAllowed}
                onChange={(e) => setSmokingAllowed(e.target.checked)}
              />
              Smoking allowed
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={hmoLicenseRequired}
                onChange={(e) => setHmoLicenseRequired(e.target.checked)}
              />
              HMO license required
            </label>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <label style={{ minWidth: 160 }}>
              <strong>EPC rating</strong>
              <select value={epcRating} onChange={(e) => setEpcRating(e.target.value)} style={inputStyle}>
                <option value="unknown">Unknown</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </select>
            </label>

            <label style={{ minWidth: 160 }}>
              <strong>Council tax band</strong>
              <select value={councilTaxBand} onChange={(e) => setCouncilTaxBand(e.target.value)} style={inputStyle}>
                <option value="unknown">Unknown</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
                <option value="H">H</option>
              </select>
            </label>

            <label style={{ minWidth: 160 }}>
              <strong>Parking</strong>
              <select value={parking} onChange={(e) => setParking(e.target.value)} style={inputStyle}>
                <option value="none">None</option>
                <option value="on-street">On-street</option>
                <option value="off-street">Off-street</option>
                <option value="garage">Garage</option>
                <option value="driveway">Driveway</option>
                <option value="permit">Permit</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <strong>Bills included</strong>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {['water','gas','electricity','council_tax','internet','tv_license'].map((b) => (
                <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={billsIncluded.includes(b)} onChange={() => toggleArrayValue(billsIncluded, setBillsIncluded, b)} />
                  {b.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <strong>Amenities</strong>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {['garden','balcony','dishwasher','washing_machine','lift','communal','parking','concierge'].map((a) => (
                <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type='checkbox' checked={amenities.includes(a)} onChange={() => toggleArrayValue(amenities, setAmenities, a)} />
                  {a.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <label>
          <strong>Virtual tour / video URL</strong>
          <input style={inputStyle} value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} />
        </label>

        <label>
          <strong>Floor</strong>
          <input style={inputStyle} value={floor} onChange={(e) => setFloor(e.target.value)} />
        </label>

        <label>
          <strong>Viewing instructions</strong>
          <textarea style={{ ...inputStyle, minHeight: 80 }} value={viewingInstructions} onChange={(e) => setViewingInstructions(e.target.value)} />
        </label>

        <fieldset style={{ border: 'none', padding: 0 }}>
          <legend style={{ fontWeight: 700 }}>Photos (max 20) — drag & drop or choose files</legend>
          <input type='file' multiple accept='image/*' onChange={(e) => handleFiles(e.target.files)} />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {photos.map((p, i) => (
              <div key={i} style={{ width: 120, position: 'relative' }}>
                <img src={p.url} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} alt={`photo-${i}`} />
                <button type='button' onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4 }}>✕</button>
              </div>
            ))}
          </div>
        </fieldset>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            type='submit'
            style={{
              padding: '0.75rem',
              background: '#6b4eff',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Create Draft Property
          </button>

          <button type='button' onClick={() => router.push('/landlord/properties')} style={{ padding: '0.75rem', borderRadius: 6 }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

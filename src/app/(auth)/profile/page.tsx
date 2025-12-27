"use client";

import { useEffect, useState } from "react";
import { formatDateShort } from "@/lib/formatDate";
import Link from "next/link";

type Interest = {
  propertyId: string;
  propertyTitle?: string;
  date?: string | null;
};

export default function ProfilePage() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [profile, setProfile] = useState({
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  const [contactPreferences, setContactPreferences] = useState({
    email: true,
    sms: false,
    whatsapp: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // LOAD EXISTING DATA
  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();

      setEmail(data.email ?? "");
      setName(data.name ?? "");

      setProfile({
        phone: data.profile?.phone ?? "",
        addressLine1: data.profile?.address?.line1 ?? "",
        addressLine2: data.profile?.address?.line2 ?? "",
        city: data.profile?.address?.city ?? "",
        postcode: data.profile?.address?.postcode ?? "",
      });

      setContactPreferences({
        email: data.profile?.contactPreferences?.email ?? true,
        sms: data.profile?.contactPreferences?.sms ?? false,
        whatsapp: data.profile?.contactPreferences?.whatsapp ?? false,
      });

      // Fetch interests for this user
      try {
        const interestsRes = await fetch("/api/applicant/interests");
        if (interestsRes.ok) {
          const interestsData = await interestsRes.json();
          setInterests(interestsData.interests || []);
        }
      } catch {
        // ignore errors fetching interests
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        profile: {
          phone: profile.phone,
          address: {
            line1: profile.addressLine1,
            line2: profile.addressLine2,
            city: profile.city,
            postcode: profile.postcode,
          },
          contactPreferences,
        },
      }),
    });

    setSaving(false);
    setMessage(res.ok ? "Profile updated" : "Failed to save profile");
  }

  const isIncomplete =
    !name ||
    !profile.phone ||
    !profile.addressLine1 ||
    !profile.city ||
    !profile.postcode;

  if (loading) {
    return (
      <div className="p-6 font-sans">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="p-6 font-sans max-w-[520px] mx-auto">
      <h2>My profile</h2>

      {/* Interests Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Registered Interests</h3>
        {interests.length === 0 ? (
          <div className="text-gray-500 text-sm">No interests registered yet.</div>
        ) : (
          <ul className="p-0 list-none">
            {interests.map((interest) => (
              <li key={interest.propertyId} className="mb-2.5 pb-2 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
                <Link href={`/applicant/properties/${interest.propertyId}`} className="text-blue-700 font-medium underline">
                  {interest.propertyTitle || "Property"}
                </Link>
                <div className="text-sm text-slate-600">{interest.date ? formatDateShort(interest.date) : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isIncomplete && (
        <div
          className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-4 text-sm"
        >
          Please complete your profile. Missing details may delay bookings or
          communication.
        </div>
      )}

      <form onSubmit={saveProfile}>
        {/* EMAIL (READ ONLY) */}
        <div className="mb-3">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            title="Email address"
            placeholder="name@example.com"
            className="w-full p-2 border border-gray-300 rounded-md bg-slate-50 text-slate-600 cursor-not-allowed"
          />
          <small className="text-xs text-gray-500">
            Email address can only be changed by an administrator.
          </small>
        </div>

        {/* NAME */}
        <div className="mb-3">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            required
            title="Full name"
            placeholder="Your full name"
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* PHONE */}
        <div className="mb-3">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={profile.phone}
            required
            title="Phone number"
            placeholder="+44 7700 900000"
            onChange={(e) =>
              setProfile({ ...profile, phone: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* ADDRESS LINE 1 */}
        <div className="mb-3">
          <label htmlFor="addressLine1">Address line 1</label>
          <input
            id="addressLine1"
            type="text"
            value={profile.addressLine1}
            required
            title="Address line 1"
            placeholder="Street address"
            onChange={(e) =>
              setProfile({ ...profile, addressLine1: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* ADDRESS LINE 2 */}
        <div className="mb-3">
          <label htmlFor="addressLine2">Address line 2</label>
          <input
            id="addressLine2"
            type="text"
            value={profile.addressLine2}
            title="Address line 2"
            placeholder="Apartment, suite, unit (optional)"
            onChange={(e) =>
              setProfile({ ...profile, addressLine2: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* CITY */}
        <div className="mb-3">
          <label htmlFor="city">City</label>
          <input
            id="city"
            type="text"
            value={profile.city}
            required
            title="City"
            placeholder="City"
            onChange={(e) =>
              setProfile({ ...profile, city: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* POSTCODE */}
        <div className="mb-3">
          <label htmlFor="postcode">Postcode</label>
          <input
            id="postcode"
            type="text"
            value={profile.postcode}
            required
            title="Postcode"
            placeholder="Postal code"
            onChange={(e) =>
              setProfile({ ...profile, postcode: e.target.value })
            }
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* CONTACT PREFERENCES */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Contact Preferences</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose how you&apos;d like to receive notifications and updates about your applications.
          </p>

          <div className="space-y-3">
            {/* EMAIL */}
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={contactPreferences.email}
                onChange={(e) =>
                  setContactPreferences({ ...contactPreferences, email: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium">📧 Email</span>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </label>

            {/* SMS */}
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={contactPreferences.sms}
                onChange={(e) =>
                  setContactPreferences({ ...contactPreferences, sms: e.target.checked })
                }
                disabled={!profile.phone}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
              />
              <div>
                <span className="font-medium">📱 SMS Text</span>
                <p className="text-sm text-gray-500">
                  Receive notifications via SMS {!profile.phone && "(requires phone number)"}
                </p>
              </div>
            </label>

            {/* WHATSAPP */}
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={contactPreferences.whatsapp}
                onChange={(e) =>
                  setContactPreferences({ ...contactPreferences, whatsapp: e.target.checked })
                }
                disabled={!profile.phone}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
              />
              <div>
                <span className="font-medium">💬 WhatsApp</span>
                <p className="text-sm text-gray-500">
                  Receive notifications via WhatsApp {!profile.phone && "(requires phone number)"}
                </p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-700 text-white px-3.5 py-2 rounded-md border-none cursor-pointer mt-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        {message && <p className="mt-3">{message}</p>}
      </form>
    </div>
  );
}



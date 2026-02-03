"use client";

import { useEffect, useState, type FormEvent } from "react";

const labelClass = "block text-sm font-medium text-slate-700 mb-1";
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
  "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
const helpClass = "mt-1 text-xs text-slate-500";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [profile, setProfile] = useState({
    phone: "",
    companyName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  const [backgroundCheck, setBackgroundCheck] = useState({
    employerName: "",
    employerEmail: "",
    previousEmployerName: "",
    previousEmployerEmail: "",
    prevLandlordName: "",
    prevLandlordContact: "",
    prevLandlordEmail: "",
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
      try {
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
          companyName: data.profile?.companyName ?? data.profile?.brandName ?? "",
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

        setBackgroundCheck({
          employerName: data.profile?.backgroundCheck?.employerName ?? "",
          employerEmail: data.profile?.backgroundCheck?.employerEmail ?? "",
          previousEmployerName: data.profile?.backgroundCheck?.previousEmployerName ?? "",
          previousEmployerEmail: data.profile?.backgroundCheck?.previousEmployerEmail ?? "",
          prevLandlordName: data.profile?.backgroundCheck?.prevLandlordName ?? "",
          prevLandlordContact: data.profile?.backgroundCheck?.prevLandlordContact ?? "",
          prevLandlordEmail: data.profile?.backgroundCheck?.prevLandlordEmail ?? "",
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          profile: {
            phone: profile.phone,
              companyName: profile.companyName,
            address: {
              line1: profile.addressLine1,
              line2: profile.addressLine2,
              city: profile.city,
              postcode: profile.postcode,
            },
            contactPreferences,
            backgroundCheck,
          },
        }),
      });

      setMessage(res.ok ? "Profile updated" : "Failed to save profile");
    } catch {
      setMessage("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const isIncomplete =
    !name ||
    !profile.phone ||
    !profile.addressLine1 ||
    !profile.city ||
    !profile.postcode;

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">My profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Keep your contact details up to date so we can reach you quickly.
        </p>
      </header>

      {isIncomplete && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Please complete your profile. Missing details may delay bookings or communication.
        </div>
      )}

      <form onSubmit={saveProfile} className="space-y-5">
        {/* ACCOUNT */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Account</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                title="Email address"
                placeholder="name@example.com"
                className={inputClass}
              />
              <p className={helpClass}>
                Email address can only be changed by an administrator.
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                required
                autoComplete="name"
                placeholder="Your full name"
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={profile.phone}
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="+44 7700 900000"
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="companyName">
                Company / brand name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={profile.companyName}
                autoComplete="organization"
                placeholder="e.g. Example Properties"
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className={inputClass}
              />
              <p className={helpClass}>
                Used to auto-fill letter templates (e.g. [COMPANY / BRAND NAME]).
              </p>
            </div>
          </div>
        </section>

        {/* ADDRESS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Address</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass} htmlFor="addressLine1">
                Address line 1
              </label>
              <input
                id="addressLine1"
                type="text"
                value={profile.addressLine1}
                required
                autoComplete="address-line1"
                placeholder="Street address"
                onChange={(e) =>
                  setProfile({ ...profile, addressLine1: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="addressLine2">
                Address line 2 <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="addressLine2"
                type="text"
                value={profile.addressLine2}
                autoComplete="address-line2"
                placeholder="Apartment, suite, unit"
                onChange={(e) =>
                  setProfile({ ...profile, addressLine2: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="city">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={profile.city}
                  required
                  autoComplete="address-level2"
                  placeholder="City"
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="postcode">
                  Postcode
                </label>
                <input
                  id="postcode"
                  type="text"
                  value={profile.postcode}
                  required
                  autoComplete="postal-code"
                  inputMode="text"
                  placeholder="Postal code"
                  onChange={(e) =>
                    setProfile({ ...profile, postcode: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>

        {/* BACKGROUND CHECK CONTACTS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">Background check contacts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Saved here so new applications can be auto-filled.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className={labelClass} htmlFor="bgEmployerName">Employer name</label>
              <input
                id="bgEmployerName"
                type="text"
                value={backgroundCheck.employerName}
                placeholder="Optional"
                onChange={(e) => setBackgroundCheck({ ...backgroundCheck, employerName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="bgEmployerEmail">Employer email</label>
              <input
                id="bgEmployerEmail"
                type="email"
                value={backgroundCheck.employerEmail}
                placeholder="name@company.com"
                onChange={(e) => setBackgroundCheck({ ...backgroundCheck, employerEmail: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="bgPrevEmployerName">Previous employer name</label>
                <input
                  id="bgPrevEmployerName"
                  type="text"
                  value={backgroundCheck.previousEmployerName}
                  placeholder="Optional"
                  onChange={(e) => setBackgroundCheck({ ...backgroundCheck, previousEmployerName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bgPrevEmployerEmail">Previous employer email</label>
                <input
                  id="bgPrevEmployerEmail"
                  type="email"
                  value={backgroundCheck.previousEmployerEmail}
                  placeholder="Optional"
                  onChange={(e) => setBackgroundCheck({ ...backgroundCheck, previousEmployerEmail: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="bgPrevLandlordName">Previous landlord name</label>
              <input
                id="bgPrevLandlordName"
                type="text"
                value={backgroundCheck.prevLandlordName}
                placeholder="Optional"
                onChange={(e) => setBackgroundCheck({ ...backgroundCheck, prevLandlordName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="bgPrevLandlordContact">Previous landlord contact</label>
              <input
                id="bgPrevLandlordContact"
                type="text"
                value={backgroundCheck.prevLandlordContact}
                placeholder="Phone or email (optional)"
                onChange={(e) => setBackgroundCheck({ ...backgroundCheck, prevLandlordContact: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="bgPrevLandlordEmail">Previous landlord email</label>
              <input
                id="bgPrevLandlordEmail"
                type="email"
                value={backgroundCheck.prevLandlordEmail}
                placeholder="Optional"
                onChange={(e) => setBackgroundCheck({ ...backgroundCheck, prevLandlordEmail: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* CONTACT PREFERENCES */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Contact preferences
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose how you&apos;d like to receive notifications and updates.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={contactPreferences.email}
                onChange={(e) =>
                  setContactPreferences({
                    ...contactPreferences,
                    email: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">Email</div>
                <div className="text-sm text-slate-600">
                  Receive notifications via email.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={contactPreferences.sms}
                onChange={(e) =>
                  setContactPreferences({
                    ...contactPreferences,
                    sms: e.target.checked,
                  })
                }
                disabled={!profile.phone}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">SMS</div>
                <div className="text-sm text-slate-600">
                  Receive notifications by text{" "}
                  {!profile.phone ? "(requires phone number)" : ""}.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={contactPreferences.whatsapp}
                onChange={(e) =>
                  setContactPreferences({
                    ...contactPreferences,
                    whatsapp: e.target.checked,
                  })
                }
                disabled={!profile.phone}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">WhatsApp</div>
                <div className="text-sm text-slate-600">
                  Receive notifications via WhatsApp{" "}
                  {!profile.phone ? "(requires phone number)" : ""}.
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>

          {message && (
            <p className="mt-2 text-center text-sm text-slate-700">{message}</p>
          )}
        </div>
      </form>
    </main>
  );
}
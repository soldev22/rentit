import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export default async function ViewingChecklistInfoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "LANDLORD") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Viewing checklist guidance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Practical, legally safer viewing notes and questions (UK/Scotland-style best
            practice). This is not formal legal advice.
          </p>
        </div>

        <Link
          href="/landlord/applications"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to applications
        </Link>
      </div>

      <div className="space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-700">
            A solid viewing checklist helps protect you from disputes later (&quot;you never told me about
            that&quot;), keeps your process consistent, and reduces the risk of discrimination claims.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">1) Before the viewing (prep + compliance)</h2>
          <p className="mt-1 text-sm text-slate-600">The “don’t get caught out” bits.</p>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Property basics</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Keys working (front door, close, locks, communal entry)</li>
                <li>Heating works (quick test)</li>
                <li>Hot water works</li>
                <li>Lights working in main areas</li>
                <li>Smoke alarms present and not chirping</li>
                <li>Carbon monoxide alarm present (if required)</li>
                <li>No obvious safety hazards (loose carpet, exposed wiring)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Documents ready</h3>
              <p className="mt-1 text-sm text-slate-700">
                You don’t have to hand these over at the viewing, but be ready to show or follow up.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>EPC certificate available to show (or “we’ll email it”)</li>
                <li>Gas safety certificate (if gas in the property)</li>
                <li>Electrical safety inspection (EICR) where applicable</li>
                <li>Legionella basic risk awareness (simple info / you’re aware)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Tenancy type clarity</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Confirm it’s a Private Residential Tenancy (PRT) (Scotland) or AST (England/Wales)</li>
                <li>Have rent, deposit, and start-date options clear</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Data + fairness</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Keep your application process consistent for everyone</li>
                <li>Use the same questions and scoring principles (avoid “random vibe checks”)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">2) At the door (start the viewing properly)</h2>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Confirm identity lightly (optional but smart)</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Ask for full name</li>
                <li>Ask for mobile number (verify it rings if you like)</li>
                <li>If they came through an app, match to the booking name</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Safety protocol</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Don’t do viewings alone if you can avoid it</li>
                <li>Tell someone where you are (basic personal safety)</li>
                <li>Keep viewing time windows tight (15–20 minutes unless they’re great)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">State the viewing rules</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>
                  “Feel free to look around, but please don’t open cupboards with personal
                  belongings (if tenanted).”
                </li>
                <li>“Photos are okay, but avoid photographing personal items.”</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">3) During the viewing (property + candidate check)</h2>
          <p className="mt-1 text-sm text-slate-600">The core bit.</p>

          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                A) Confirm the facts (avoid misrepresentation disputes)
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Rent per month: £X</li>
                <li>Deposit amount: £X</li>
                <li>Bills included? (Yes/No)</li>
                <li>Furnished / part furnished / unfurnished</li>
                <li>Parking included? (Yes/No)</li>
                <li>Garden/shared areas: what’s included</li>
                <li>Council tax band (if known)</li>
                <li>Internet availability / mobile signal (if relevant)</li>
                <li>Heating type (gas combi / electric / storage)</li>
                <li>Typical heating cost expectations (be careful: don’t guarantee)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">B) Make key disclosures</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Any known issues: damp history, noise, repairs planned (be honest)</li>
                <li>Building quirks: old windows, communal stairwell rules</li>
                <li>Factoring / stair cleaning info if applicable</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">C) Ask only fair questions (legally safer)</h3>
              <div className="mt-2 space-y-3 text-sm text-slate-700">
                <div>
                  <div className="font-semibold text-slate-900">Household + affordability</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Who would live here? (number of adults + children)</li>
                    <li>Intended move-in date?</li>
                    <li>Employment situation / income range (keep it light if you prefer)</li>
                    <li>Any pets? (if it affects your pets policy)</li>
                    <li>Do you smoke? (if you have a no-smoking rule)</li>
                  </ul>
                </div>

                <div>
                  <div className="font-semibold text-slate-900">Tenancy behaviour</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Any CCJs / arrears history? (optional but common)</li>
                    <li>Current housing situation (renting now / homeowner / living with family)</li>
                  </ul>
                </div>

                <div>
                  <div className="font-semibold text-slate-900">References & checks</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Are you happy to undergo referencing? (Yes/No)</li>
                    <li>Can you provide landlord reference? (Yes/No)</li>
                    <li>Can you provide proof of income? (Yes/No)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">4) What not to ask (legally risky)</h2>
          <p className="mt-2 text-sm text-slate-700">
            Avoid questions about religion, ethnicity, nationality (unless doing lawful right-to-rent
            checks), disability/health, pregnancy, sexual orientation, relationship status, political
            beliefs.
          </p>
          <p className="mt-3 text-sm text-slate-700">
            Also avoid vibe-based comments like “this isn’t suitable for your type of family” or
            “we prefer professionals”. Even if you mean well, it can be interpreted as
            discrimination.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">5) Making a decision (defensible process)</h2>
          <p className="mt-2 text-sm text-slate-700">
            Best approach: score applications consistently. Keep brief written notes about why you
            accepted/rejected.
          </p>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-900">Example simple scoring criteria</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Affordability ratio (rent vs income)</li>
              <li>Referencing outcome</li>
              <li>Previous landlord reference</li>
              <li>Employment stability</li>
              <li>Pets fit policy</li>
              <li>Move-in date fits availability</li>
              <li>Completeness of application</li>
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">6) Deposits + holding deposits (handle carefully)</h2>
          <p className="mt-2 text-sm text-slate-700">
            If you accept a holding deposit, only do it with a clear written agreement: what happens
            if they pull out, what happens if referencing fails, decision timeline.
          </p>
          <p className="mt-3 text-sm text-slate-700">
            For tenancy deposits, clearly state deposit amount, how it’s protected (deposit scheme),
            and when it must be paid.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">7) After the viewing (follow-up + records)</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Mark attendance (Attended / No show / Cancelled)</li>
            <li>Write short notes: interested/not interested, move-in timing, pets, key questions</li>
            <li>
              Send a standard message: “Thanks for attending. If you’d like to proceed, please
              submit the application form.”
            </li>
            <li>
              If multiple applicants: “We’re conducting viewings over X days and will confirm next
              steps by Y date.”
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">8) Template (copy/paste)</h2>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
            <div className="font-semibold">Viewing checklist</div>
            <div className="mt-2 space-y-1">
              <div>Date/time:</div>
              <div>Property:</div>
              <div>Viewer name:</div>
              <div>Phone:</div>
              <div>Attended: Yes / No</div>
              <div>Interested: Yes / No</div>
              <div className="mt-3 font-semibold">Property</div>
              <div>Heating checked: Yes / No</div>
              <div>Hot water checked: Yes / No</div>
              <div>Smoke alarms: Yes / No</div>
              <div>CO alarm (if relevant): Yes / No</div>
              <div>Any issues seen:</div>
              <div>Repairs promised: Yes / No (detail)</div>
              <div className="mt-3 font-semibold">Applicant</div>
              <div>Move-in date:</div>
              <div>Number of occupants:</div>
              <div>Employment status:</div>
              <div>Income range:</div>
              <div>Pets: Yes / No</div>
              <div>Smoking: Yes / No</div>
              <div>Happy with referencing: Yes / No</div>
              <div>Notes:</div>
              <div className="mt-3 font-semibold">Next step</div>
              <div>Invite to apply: Yes / No</div>
              <div>Send follow-up email/SMS: Yes / No</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">If you want it truly bulletproof</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Keep the exact same questions for every applicant</li>
              <li>Use a consistent scoring/decision framework</li>
              <li>Keep basic written notes on why you accepted/rejected</li>
              <li>Never freestyle personal questions</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

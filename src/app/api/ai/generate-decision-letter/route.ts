import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withApiAudit } from "@/lib/api/withApiAudit";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const GenerateDecisionLetterBodySchema = z
  .object({
    decision: z.enum(["pass", "fail"]),
    letterDate: z.string().max(100).optional(),
    applicantName: z.string().min(1).max(200),
    coTenantName: z.string().min(1).max(200).optional(),
    applicantAddress: z.string().max(1000).optional(),

    propertyTitle: z.string().min(1).max(200),
    propertyAddress: z.string().min(1).max(1000),

    rentPcm: z.number().optional(),
    deposit: z.number().optional(),
    tenancyLengthMonths: z.number().optional(),
    availabilityDate: z.string().optional(),
    moveInDate: z.string().optional(),

    landlordNotes: z.string().max(2000).optional(),
    landlordName: z.string().max(200).optional(),
    landlordEmail: z.string().max(200).optional(),
    landlordPhone: z.string().max(50).optional(),
    landlordAddress: z.string().max(1000).optional(),
    dashboardLink: z.string().min(1).max(500),

    currentSubject: z.string().max(200).optional(),
    currentMessage: z.string().max(10000).optional(),
  })
  .strict();

function formatUkDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function generateDecisionLetter(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "LANDLORD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateDecisionLetterBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  const letterDate = input.letterDate || formatUkDateLong(new Date());

  const tenancyDetails = [
    typeof input.rentPcm === "number" ? `Monthly rent: £${input.rentPcm} pcm` : "Monthly rent: [to be confirmed]",
    typeof input.deposit === "number" ? `Deposit: £${input.deposit}` : "Deposit: [to be confirmed]",
    typeof input.tenancyLengthMonths === "number"
      ? `Tenancy term: ${input.tenancyLengthMonths} months (initial term)`
      : "Tenancy term: [to be confirmed]",
    input.moveInDate ? `Proposed move-in date: ${new Date(input.moveInDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}` : null,
    input.availabilityDate ? `Property available from: ${new Date(input.availabilityDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}` : null,
  ].filter(Boolean);

  const recipientsLine = input.coTenantName
    ? `${input.applicantName} and ${input.coTenantName}`
    : input.applicantName;

  const prompt = `
Write a UK landlord decision letter as PLAIN TEXT (not HTML).

Rules:
- Use ONLY the information provided below. Do not invent dates, prices, or facts.
- Include a letter header with BOTH addresses:
  - Applicant full address
  - Property full address
- Also include a landlord contact block (name + address if provided, and phone/email if provided)
- Include the date (use the provided letter date).
- Start with "Dear <name(s)>," and end with a polite sign-off.
- If any tenancy details are missing, write "[to be confirmed]" rather than guessing.
- Keep tone professional, neutral and clear.
- Do not include emojis.

Decision: ${input.decision === "pass" ? "SUCCESSFUL" : "CANNOT PROCEED"}
Letter date: ${letterDate}
Applicants: ${recipientsLine}
Applicant address (multiline):
${input.applicantAddress || "[Applicant address on file not available]"}

Landlord contact (multiline, optional):
${[input.landlordName, input.landlordAddress, input.landlordEmail ? `Email: ${input.landlordEmail}` : "", input.landlordPhone ? `Tel: ${input.landlordPhone}` : ""].filter(Boolean).join("\n")}

Property title: ${input.propertyTitle}
Property address (multiline):
${input.propertyAddress}

Tenancy details to include under a "Next steps (tenancy details)" section:
${tenancyDetails.map((l) => `- ${l}`).join("\n")}

Landlord notes (optional):
${input.landlordNotes || ""}

Applicant dashboard link:
${input.dashboardLink}

Return a JSON object ONLY (no markdown fences) with:
- subject (string)
- message (string)  // the full letter
- smsMessage (string) // <= 240 chars, include decision + dashboard link

If currentSubject/currentMessage are provided, you may improve them but keep the same decision.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You write formal UK tenancy decision letters as plain text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }

    const parsedJson = safeJsonParse(content);
    const OutputSchema = z.object({
      subject: z.string().min(1).max(200),
      message: z.string().min(1).max(12000),
      smsMessage: z.string().min(1).max(500).optional(),
    });

    const out = OutputSchema.safeParse(parsedJson);
    if (!out.success) {
      return NextResponse.json({ error: "AI returned an invalid response" }, { status: 502 });
    }

    return NextResponse.json(out.data);
  } catch (err) {
    console.error("[AI GENERATE DECISION LETTER ERROR]", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}

export const POST = withApiAudit(generateDecisionLetter, {
  action: "API_REQUEST",
  description: () => "Generated decision letter draft (AI)",
});

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  // 🔐 Require authenticated user
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let description: unknown;

  try {
    const body = await req.json();
    description = body.description;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    typeof description !== "string" ||
    description.trim().length < 10 ||
    description.length > 1000
  ) {
    return NextResponse.json(
      {
        error:
          "Description must be a string between 10 and 1000 characters",
      },
      { status: 400 }
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You rewrite UK property rental descriptions in a clear, professional, neutral tone.",
        },
        {
          role: "user",
          content: `
Rewrite the following property description so it is:
- clear and professional
- suitable for a UK rental listing
- accurate and factual
- not exaggerated
- no emojis
- no marketing fluff
- do not add features not mentioned

Original description:
"""
${description}
"""
          `,
        },
      ],
    });

    const improved =
      completion.choices[0]?.message?.content?.trim();

    if (!improved) {
      throw new Error("Empty AI response");
    }

    return NextResponse.json({
      improvedDescription: improved,
    });
  } catch (err) {
    console.error("[AI DESCRIPTION ERROR]", err);

    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 }
    );
  }
}

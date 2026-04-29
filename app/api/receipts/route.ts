import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";
import { requireAnyAdminApi } from "@/lib/api-auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT =
  "Extract the total amount due or grand total from this receipt or invoice. " +
  "Reply with ONLY the numeric amount in the format: AMOUNT: 123.45 (no currency symbols). " +
  "If you cannot determine the total, reply: AMOUNT: unknown";

export async function POST(req: NextRequest) {
  const auth = await requireAnyAdminApi();
  if (auth instanceof NextResponse) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload to Vercel Blob for persistent storage
  const blob = await put(`receipts/${Date.now()}-${file.name}`, buffer, {
    access: "public",
    contentType: file.type,
  });

  let extractedAmount: number | null = null;

  try {
    const isPdf = file.type === "application/pdf";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlock: any = isPdf
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: buffer.toString("base64"),
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: file.type || "image/jpeg",
            data: buffer.toString("base64"),
          },
        };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: PROMPT }],
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    extractedAmount = parseAmountFromResponse(text);
  } catch (err) {
    console.error("Claude receipt scan failed:", err);
    // Return null — the form will treat unknown extracted amount as an error
  }

  return NextResponse.json({ url: blob.url, extractedAmount });
}

function parseAmountFromResponse(text: string): number | null {
  const match = text.match(/AMOUNT:\s*([\d,]+\.?\d*)/i);
  if (!match) return null;
  const val = parseFloat(match[1].replace(/,/g, ""));
  return isNaN(val) ? null : val;
}

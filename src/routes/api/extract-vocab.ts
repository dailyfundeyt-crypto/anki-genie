import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are a specialized "Spanish Vocabulary Architect".

Your task: meticulously analyze the provided Spanish text (and/or images containing Spanish text — perform OCR on images) and extract every meaningful Spanish vocabulary item.

Rules for each card:
- "spanish": the Spanish word or short phrase.
  - For nouns: include the definite article ("el casa" → "la casa", "el libro").
  - For verbs: use the infinitive form (e.g., "hablar", not "hablo").
  - For adjectives: use the masculine singular form.
- "german": an accurate, natural German translation.
  - For nouns: include the German article ("das Haus", "der Tisch").
  - For verbs: infinitive ("sprechen").
- No duplicates. No proper names unless clearly vocabulary. Skip filler words (y, o, de, la, el, un, una) unless they are the focus.
- Preserve original case only for proper nouns.

Return ONLY valid JSON matching the schema. No commentary.`;

const CardsSchema = z.object({
  cards: z
    .array(
      z.object({
        spanish: z.string(),
        german: z.string(),
      }),
    )
    .max(200),
});

type Body = {
  text?: string;
  images?: string[]; // data URLs
};

export const Route = createFileRoute("/api/extract-vocab")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const text = (body.text ?? "").trim();
        const images = body.images ?? [];
        if (!text && images.length === 0) {
          return new Response("Provide text or images", { status: 400 });
        }

        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; image: string }
        > = [];
        content.push({
          type: "text",
          text: text
            ? `Extract Spanish vocabulary from the following text and any attached images:\n\n${text}`
            : "Extract Spanish vocabulary from the attached image(s).",
        });
        for (const img of images) {
          content.push({ type: "image", image: img });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const { output } = await generateText({
            model,
            system: SYSTEM_PROMPT,
            // @ts-expect-error multimodal content blocks accepted by provider
            messages: [{ role: "user", content }],
            experimental_output: Output.object({ schema: CardsSchema }),
          });
          return Response.json(output);
        } catch (err: unknown) {
          const e = err as { statusCode?: number; message?: string };
          const status = e.statusCode ?? 500;
          if (status === 429) {
            return new Response("Rate limit exceeded. Please try again shortly.", { status: 429 });
          }
          if (status === 402) {
            return new Response("AI credits exhausted. Add credits in Workspace → Usage.", {
              status: 402,
            });
          }
          return new Response(e.message ?? "Extraction failed", { status: 500 });
        }
      },
    },
  },
});

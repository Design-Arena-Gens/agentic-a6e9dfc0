import { NextResponse } from "next/server";
import {
  buildMetadata,
  chatInputSchema,
  chatRespond,
  generateVideoPlan,
  metadataInputSchema,
  videoPlanInputSchema
} from "@/lib/agent";
import { z } from "zod";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("planVideo"),
    payload: videoPlanInputSchema
  }),
  z.object({
    action: z.literal("generateMetadata"),
    payload: metadataInputSchema.extend({
      planDetails: z.object({
        hook: z.string(),
        storyline: z.array(z.string()),
        shots: z.array(z.string()),
        broll: z.array(z.string()),
        cta: z.string(),
        voiceOver: z.array(z.string())
      })
    })
  }),
  z.object({
    action: z.literal("chat"),
    payload: chatInputSchema
  })
]);

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = requestSchema.parse(json);

    switch (data.action) {
      case "planVideo": {
        const plan = generateVideoPlan(data.payload);
        return NextResponse.json({ success: true, plan });
      }
      case "generateMetadata": {
        const { planDetails, ...input } = data.payload;
        const metadata = buildMetadata(input, planDetails);
        return NextResponse.json({ success: true, metadata });
      }
      case "chat": {
        const reply = chatRespond(data.payload);
        return NextResponse.json({ success: true, reply });
      }
    }
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues : (error as Error).message;
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

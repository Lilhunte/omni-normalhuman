import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { OramaManager } from "@/lib/orama";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSubscribed = await getSubscriptionStatus();
    if (!isSubscribed) {
      const today = new Date().toDateString();
      const chatbotInteraction = await db.chatbotInteraction.findUnique({
        where: { day: today, userId },
      });

      if (!chatbotInteraction) {
        await db.chatbotInteraction.create({
          data: { day: today, count: 1, userId },
        });
      } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
        return NextResponse.json({ error: "Limit reached" }, { status: 429 });
      }
    }

    const { messages, accountId } = await req.json();
    const oramaManager = new OramaManager(accountId);
    await oramaManager.initialize();

    const lastMessage = messages[messages.length - 1];
    const context = await oramaManager.vectorSearch({
      prompt: lastMessage.content,
    });

    const systemPrompt = `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
THE TIME NOW IS ${new Date().toLocaleString()}

START CONTEXT BLOCK
${context.hits.map((hit) => JSON.stringify(hit.document)).join("\n")}
END OF CONTEXT BLOCK

When responding, please keep in mind:
- Be helpful, clever, and articulate.
- Rely on the provided email context to inform your responses.
- If the context does not contain enough information to answer a question, politely say you don't have enough information.
- Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
- Do not invent or speculate about anything that is not directly supported by the email context.
- Keep your responses concise and relevant to the user's questions or the email being composed.`;

    const { textStream } = await streamText({
      model: openai("gpt-4"),
      system: systemPrompt,
      messages,
    });

    // Consume the stream (example for async iterable)
    let result = "";
    for await (const chunk of textStream) {
      result += chunk;
    }

    // After stream completes, update interaction count
    const today = new Date().toDateString();
    await db.chatbotInteraction.update({
      where: { userId, day: today },
      data: { count: { increment: 1 } },
    });

    return new Response(result, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong, please try again." },
      { status: 500 },
    );
  }
}

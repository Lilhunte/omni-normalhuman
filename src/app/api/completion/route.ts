import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const { textStream } = await streamText({
    model: openai("gpt-5"),
    messages: [
      {
        role: "system",
        content: `You are a helpful AI embedded in a notion text editor app that is used to autocomplete sentences.
                The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
                AI is a well-behaved and well-mannered individual.
                AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.`,
      },
      {
        role: "user",
        content: `I am writing a piece of text in a notion text editor app.
                Help me complete my train of thought here: ##${prompt}##
                keep the tone of the text consistent with the rest of the text.
                keep the response short and sweet.`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

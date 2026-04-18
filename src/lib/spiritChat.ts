import { systemPromptForSpirit } from "../data/bubble-scripts"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

type SpiritReplyInput = {
  emotion: string
  cityLabel: string
  history: { from: "self" | "other"; text: string }[]
  latestUserMessage: string
}

export async function getSpiritReply(input: SpiritReplyInput): Promise<string> {
  const webhookUrl = import.meta.env.VITE_N8N_CHAT_URL
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.reply) return data.reply
      }
    } catch (e) {
      console.warn("chat webhook failed", e)
    }
  }

  const fallbacks: Record<string, string[]> = {
    melancholy: [
      "yeah. it's one of those days.",
      "i've been sitting with that feeling too.",
      "the grey kind. i know what you mean.",
    ],
    joy: [
      "i love that. hold onto it.",
      "something about right now feels bigger than usual.",
      "yes. exactly.",
    ],
    excitement: [
      "okay i want to hear more.",
      "that's the good kind of restless.",
      "keep going. what's next.",
    ],
    calm: [
      "mm. me too.",
      "just this is enough.",
      "the quiet is doing something good.",
    ],
    lonely: [
      "same. but less now.",
      "i hear you. i'm here.",
      "yeah. thanks for being on the other side of this.",
    ],
  }
  const pool = fallbacks[input.emotion] || fallbacks.melancholy
  return pool[Math.floor(Math.random() * pool.length)]
}

export function buildSpiritMessages(
  emotion: string,
  cityLabel: string,
  history: { from: "self" | "other"; text: string }[],
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPromptForSpirit(emotion, cityLabel) },
  ]
  for (const m of history) {
    messages.push({
      role: m.from === "self" ? "user" : "assistant",
      content: m.text,
    })
  }
  return messages
}

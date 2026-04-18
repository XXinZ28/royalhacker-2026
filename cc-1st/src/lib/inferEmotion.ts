import imagePool from "../data/image-pool.json"
import { biasMessages } from "../data/bias-messages"

type Emotion = "joy" | "melancholy" | "excitement" | "calm" | "lonely"

type InferInput = {
  text: string
  imageIds: string[]
}

type InferOutput = {
  emotion: Emotion
  city: string
  biasMessage: string
}

const textEmotionKeywords: Record<Emotion, string[]> = {
  joy: ["happy", "excited", "glad", "great", "love", "beautiful", "free", "light", "smile", "sun"],
  melancholy: ["sad", "alone", "lonely", "miss", "tired", "blue", "grey", "rain", "quiet", "empty", "lost"],
  excitement: ["stoked", "hyped", "can't wait", "rush", "fire", "wild", "chaos", "intense", "alive"],
  calm: ["okay", "fine", "still", "peaceful", "breathe", "slow", "enough", "calm", "steady"],
  lonely: ["alone", "isolated", "nobody", "invisible", "distant", "far", "disconnect", "silent"],
}

function scoreFromText(text: string): Partial<Record<Emotion, number>> {
  const lower = text.toLowerCase()
  const scores: Partial<Record<Emotion, number>> = {}
  for (const [emotion, keywords] of Object.entries(textEmotionKeywords)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1
    }
    if (score > 0) scores[emotion as Emotion] = score
  }
  return scores
}

function scoreFromImages(imageIds: string[]): Partial<Record<Emotion, number>> {
  const scores: Partial<Record<Emotion, number>> = {}
  const themeToEmotion = imagePool.themeToEmotion as Record<string, Emotion[]>

  for (const id of imageIds) {
    const theme = id.split("-")[0]
    const themeMap: Record<string, string> = {
      iso: "isolation",
      con: "connection",
      res: "restlessness",
      pea: "peace",
      ove: "overwhelm",
      lon: "longing",
    }
    const themeName = themeMap[theme]
    if (!themeName) continue
    const emotions = themeToEmotion[themeName] || []
    for (const e of emotions) {
      scores[e] = (scores[e] || 0) + 1
    }
  }
  return scores
}

export function inferEmotionLocal(input: InferInput): InferOutput {
  const textScores = scoreFromText(input.text)
  const imageScores = scoreFromImages(input.imageIds)

  const combined: Record<string, number> = {}
  for (const [e, s] of Object.entries(textScores)) combined[e] = (combined[e] || 0) + (s || 0) * 1.5
  for (const [e, s] of Object.entries(imageScores)) combined[e] = (combined[e] || 0) + (s || 0)

  let topEmotion: Emotion = "melancholy"
  let topScore = -1
  for (const [e, s] of Object.entries(combined)) {
    if (s > topScore) {
      topScore = s
      topEmotion = e as Emotion
    }
  }
  if (topScore <= 0) topEmotion = "melancholy"

  const emotionToCities = imagePool.emotionToCities as Record<Emotion, string[]>
  const cities = emotionToCities[topEmotion]
  const city = cities[Math.floor(Math.random() * cities.length)]

  return {
    emotion: topEmotion,
    city,
    biasMessage: biasMessages[city] || biasMessages.lisbon,
  }
}

export async function inferEmotion(input: InferInput): Promise<InferOutput> {
  const webhookUrl = import.meta.env.VITE_N8N_EMOTION_URL
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.emotion && data.city) return data
      }
    } catch (e) {
      console.warn("n8n webhook failed, using local inference", e)
    }
  }
  return inferEmotionLocal(input)
}

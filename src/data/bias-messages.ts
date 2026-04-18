export const biasMessages: Record<string, string> = {
  lisbon:
    "Your subconscious kept choosing Lisbon. Every image pulled you toward something slow, beautiful, and a little melancholy — light through fog, a single chair by a window. This is a city that knows how to hold sadness gently.",
  tokyo:
    "Your choices point to Tokyo — the weight of a city that never stops, and the loneliness only a crowd can create. You're drawn to being surrounded and unseen at the same time.",
  berlin:
    "Berlin keeps appearing in your instincts. Creative restlessness. The need to make something out of the noise. You don't want quiet — you want meaning in the chaos.",
  bali:
    "Bali is where your subconscious wanted to go. Sun, presence, the feeling that right now is enough. You picked images that forgave you for not trying so hard.",
  mexicocity:
    "Mexico City — warmth, chaos, life at full volume. Your choices said you're ready for all of it. Nothing half-lived.",
  copenhagen:
    "Copenhagen. Clean, quiet, honest. Your instincts chose a place where it's okay to just be still, where no one will demand that you perform your feelings.",
}

export const cityCoords: Record<string, { lat: number; lng: number; label: string }> = {
  lisbon: { lat: 38.7223, lng: -9.1393, label: "Lisbon" },
  tokyo: { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  berlin: { lat: 52.52, lng: 13.405, label: "Berlin" },
  bali: { lat: -8.4095, lng: 115.1889, label: "Bali" },
  mexicocity: { lat: 19.4326, lng: -99.1332, label: "Mexico City" },
  copenhagen: { lat: 55.6761, lng: 12.5683, label: "Copenhagen" },
}

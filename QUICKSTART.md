# EchoWander 快速启动指南

## ✅ 你需要完成的 3 件事

---

## 1️⃣ n8n 配置（2 分钟）

### 你需要提供给我：
- **n8n Base URL**: 你的 n8n cloud 实例地址
  - 格式：`https://your-name.app.n8n.cloud`
  - 在哪里找：登录 n8n cloud，看浏览器地址栏

### 我会帮你做的：
一旦你给我 URL，我会用你提供的 JWT token 自动部署 5 个工作流：
- `emotion-intake` - 接收情绪数据
- `match-finder` - 匹配用户
- `chat-send` - 发送消息
- `chat-poll` - 轮询消息
- `match-end` - 结束匹配

**或者**：如果你不想给我 URL，可以手动导入：
1. 打开 n8n UI → Workflows
2. 点击 "Import from File"
3. 逐个导入 `n8n-workflows/` 文件夹里的 5 个 JSON 文件

---

## 2️⃣ Google Sheet 设置（5 分钟）

### 步骤：

#### Step 1: 创建 Google Sheet
1. 访问 https://sheets.new
2. 创建新的空白电子表格
3. 重命名为：`EchoWander User Data`

#### Step 2: 创建第一个 Tab - `user_vectors`
1. 点击左下角 "+" 添加新工作表
2. 命名为：`user_vectors`
3. 在第一行添加这些列标题：

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| session_id | initial_P | initial_A | final_D | p_deltas | a_deltas | final_P | final_A | timestamp | matched |

#### Step 3: 创建第二个 Tab - `chat_messages`
1. 再添加一个新工作表
2. 命名为：`chat_messages`
3. 在第一行添加这些列标题：

| A | B | C | D | E |
|---|---|---|---|---|
| message_id | match_pair_id | from_session_id | text | timestamp |

#### Step 4: 获取 Sheet ID
1. 复制浏览器地址栏的 URL
2. 格式类似：`https://docs.google.com/spreadsheets/d/1ABC123xyz/edit#gid=0`
3. **Sheet ID 是**：`1ABC123xyz` （/d/ 和 /edit 之间的部分）

#### Step 5: 分享权限
1. 点击右上角 "分享"
2. 选择 "任何知道链接的人都可以查看"
3. 或者设置为 "公开"（如果 n8n 需要写入权限）

---

## 3️⃣ Lovable 项目启动（15 分钟）

### 步骤：

#### Step 1: 创建 Lovable 项目
1. 访问 https://lovable.dev
2. 点击 "New Project"
3. 选择 "ChatGPT/Claude" 模式

#### Step 2: 按顺序粘贴 5 个 Prompts

---

### **Prompt 1 - 项目脚手架**（粘贴后等待生成）

```
Build a web app called Resonance. It's an anonymous emotion-matching experience: the user answers 3 questions + picks 3 pairs of images, and gets matched with another user feeling the same way for a short anonymous chat.

Visual aesthetic:
- Dark background: gradient from deep navy (#0a0e27) to near-black
- Accents: soft purple (#a78bfa), pink (#f9a8d4), warm gold (#fbbf24)
- Typography: elegant serif for headlines (Cormorant Garamond), clean sans-serif for body (Inter)
- Dreamy, contemplative, healing — inspired by the game Journey
- Heavy use of soft glows, gentle blur, slow easing
- Never aggressive, never loud

Tech:
- React + TypeScript + Vite
- TailwindCSS for styling
- Framer Motion for transitions
- Zustand for session state
- Fetch calls only — no SDKs, no backend code in the frontend
- Read env vars: VITE_N8N_INTAKE_URL, VITE_N8N_MATCH_URL, VITE_N8N_CHAT_SEND_URL, VITE_N8N_CHAT_POLL_URL, VITE_N8N_MATCH_END_URL

Routes (single-page app with smooth fade transitions):
- / — landing: centered serif title + single button "Begin now to enter your emotion world"
- /q — three onboarding questions, one per screen
- /rounds — three image-pair rounds (color, nature, space)
- /waiting — "finding someone..." while matching
- /chat — the matched chat view
- /ended — after a chat ends

Session identity:
- On first visit, generate a UUID and store in localStorage under key resonance_session_id. Reuse on later visits.
- If the user refreshes during questionnaire or rounds, restart that flow (v1 has no resume).
- If refreshed after matching, read matched_user_id from the backend using session_id and re-enter the chat.

Landing page (/):
- Centered, full-height
- Serif title: "Resonance"
- Tagline, italicized, smaller: "one moment, one stranger, the same weather inside."
- Single glowing button: "Begin now to enter your emotion world" → navigates to /q
- Faint starfield in the background (pure CSS animation)

Start by scaffolding this. I'll paste the next screens in order.
```

---

### **Prompt 2 - 三个问题页面**（等 Prompt 1 完成后再粘贴）

```
Build the /q flow. Three questions, each its own full-screen view, advanced sequentially with smooth fade transitions. A slim 3-dot progress indicator at the top.

The answers populate the Zustand store as:
- Q1 → initial_P ∈ {+0.7, 0, -0.7}
- Q2 → initial_A ∈ {+0.7, 0, -0.7}
- Q3 → final_D ∈ {1, 0} (FIXED — never changes after this point)

Q1 — Pleasure
Serif prompt, centered: "How do you feel overall right now?"

Three stacked option cards (large tap targets, glow-on-hover):
- 🙂 Pretty good / a little happy → +0.7
- 😐 Neither good nor bad → 0
- 🙁 Not great / a little heavy → -0.7

Tap → fade → Q2.

Q2 — Arousal
Serif prompt, centered: "What does your current state feel more like?"

- ⚡ Tense / anxious / excited → +0.7
- 🌊 Steady / normal → 0
- 🪫 Tired / low energy → -0.7

Tap → fade → Q3.

Q3 — Dominance (locked after this screen)
Serif prompt, centered: "What do you want more right now?"

- 🗣️ Someone to talk to / to be listened to → 1
- 💡 To hear some advice / to find help → 0

Small helper text below, subtle: "this one won't change — it decides who you match with."

Tap → fade → compute bucket from (initial_P, initial_A), then navigate to /rounds.

Bucket computation:
const rowIdx = initial_P === 0.7 ? 0 : initial_P === 0 ? 1 : 2
const colIdx = initial_A === 0.7 ? 0 : initial_A === 0 ? 1 : 2
const bucket_id = rowIdx * 3 + colIdx + 1

Load picture-dataset/bucket_${bucket_id}.json — you'll use it in the next screen.
```

---

### **Prompt 3 - 图片选择轮次**（等 Prompt 2 完成后再粘贴）

```
Build the /rounds flow. Three rounds, each a full-screen view with two images side-by-side. The user picks one per round. The picks fine-tune their P/A vector.

Layout (per round):
- Full screen, dark background with subtle starfield
- 3-dot progress indicator at the top (same visual style as /q)
- Tiny italic instruction, centered: "which one pulls you? no thinking — just tap."
- Two images side by side, each filling ~45% of viewport width, ~60% of viewport height
- Tap an image → it ripples / briefly glows → brief fade out → next round slides in from the right
- Small theme label above each pair (subtle, sans-serif, low opacity): "color", "nature", "space"

Data source:
Load picture-dataset/bucket_${bucket_id}.json where bucket_id was computed at the end of /q. The file has 6 images; group them by round:
- Round 1: theme === "color" → two images (warm, cold)
- Round 2: theme === "nature" → two images (sunny, stormy)
- Round 3: theme === "space" → two images (vast, close)

Left/right order can be randomized per load.

On tap:
Append the picked image's p_delta and a_delta to two arrays in the Zustand store:
selected_p_deltas.push(image.p_delta)
selected_a_deltas.push(image.a_delta)

After round 3:
Compute the final vector:
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const final_P = initial_P + avg(selected_p_deltas) * 0.5
const final_A = initial_A + avg(selected_a_deltas) * 0.5

POST to VITE_N8N_INTAKE_URL:
{
  "session_id": "<uuid>",
  "initial_P": 0.7,
  "initial_A": 0.0,
  "final_D": 1,
  "p_deltas": [0.20, 0.25, 0.15],
  "a_deltas": [0.15, 0.10, 0.10]
}

Then navigate to /waiting and kick off matching.

Polish:
- Each round: 400 ms fade-in, 300 ms fade-out on tap
- Picked image briefly scales to 1.03 before fading
- Unpicked image fades to 40% opacity before fading out
```

---

### **Prompt 4 - 等待匹配页面**（等 Prompt 3 完成后再粘贴）

```
Build the /waiting screen. It appears right after the intake POST returns, and loops a match-poll until a partner is found.

Visual:
- Full screen, black background with slow nebula glow
- Centered: a pulsing orb (CSS radial gradient, 2s breathing animation)
- Below the orb, fading sequential text lines (each ~1.2 s in, ~0.8 s out, staggered):
  1. "mapping your emotional geography..."
  2. "listening for someone like you..."
  3. "three other spirits are in this room tonight." (only if > 0 polls without match)

Polling:
Immediately on mount, POST to VITE_N8N_MATCH_URL:
{ "session_id": "<uuid>", "final_P": 0.85, "final_A": 0.10, "final_D": 1 }

Response cases:
- { matched: true, partner_session_id, match_timestamp, match_pair_id, opener } → store in Zustand, navigate to /chat
- { matched: false, message } → display softly, wait 3 seconds, POST again

Continue polling every 3 seconds up to a max of ~60 seconds, then show:
"you're the first one here right now. stay a moment, or come back later."
[ Try again ] [ Leave ]

Back behavior:
Browser back from /waiting → return to / and clear transient state (keep session_id in localStorage).
```

---

### **Prompt 5 - 聊天页面**（等 Prompt 4 完成后再粘贴）

```
Build the /chat screen. The match is already established, the AI opener is in Zustand — render it as the first message from the partner, then open the chat.

Layout:
- Full screen, black background with faint purple/pink nebula glow
- Centered: a large translucent bubble shape (round-ish, slightly irregular) with soft glowing border and a 4 s breathing scale animation
- Messages appear as soft-edged chat cards inside the bubble; user's on the right, partner's on the left
- A subtle header: the shared anonymous tag (see below)
- A footer input: text field + "send" glowing button

Identities:
Generate anonymous spirit handles locally:
- Both users share a "weather word" derived deterministically from their match_pair_id (e.g. "BlueMist", "QuietTide", "GoldenRoom", "SlowRain").
- Each user also gets a 2-digit suffix from the last two chars of their own session_id.
- Result: "BlueMist #47" vs "BlueMist #12".
- No real names, no avatars beyond the shared handle.

Opener:
On mount, render the opener string received from /match as the first partner message, animated in 600 ms after arrival on the screen.

Sending a message:
When user sends, POST to VITE_N8N_CHAT_SEND_URL:
{
  "match_pair_id": "<id>",
  "from_session_id": "<my uuid>",
  "text": "<message>"
}

Append it optimistically to the local message list (right side).

Receiving messages:
Poll VITE_N8N_CHAT_POLL_URL every 2.5 s:
GET /webhook/chat-poll?match_pair_id=<id>&since=<ISO-8601 of last seen>

Response: { messages: [{ message_id, from_session_id, text, timestamp }, ...] }. For each message whose from_session_id !== me, render on the left.

Dedupe by message_id to avoid rendering echoes of your own optimistic sends when they come back.

Leaving / ending the chat:
Top-right: a small "leave" icon. On click:
1. Confirm modal: "end this moment?"
2. If yes, POST to VITE_N8N_MATCH_END_URL:
{ "session_id": "<my uuid>", "partner_session_id": "<partner uuid>" }
3. Navigate to /ended.

If the partner ends first, show a soft fade and auto-navigate to /ended.

Polish:
- Messages shimmer gently as they arrive
- Bubble has a subtle breathing scale (1.00 → 1.02 → 1.00 over 4 s)
- No typing indicator — keep it quiet

/ended screen:
- Centered, full height, starfield fades
- Serif line: "the moment dissolves. you carry what stayed."
- Below: a single button "return to the start" → clear transient Zustand state, navigate to /
```

---

## 4️⃣ 配置环境变量

### 在 Lovable 项目中设置 Env Vars：

1. 在 Lovable 左侧面板点击 "Environment Variables"
2. 添加以下变量：

```
VITE_N8N_INTAKE_URL=https://your-name.app.n8n.cloud/webhook/emotion-intake
VITE_N8N_MATCH_URL=https://your-name.app.n8n.cloud/webhook/match-finder
VITE_N8N_CHAT_SEND_URL=https://your-name.app.n8n.cloud/webhook/chat-send
VITE_N8N_CHAT_POLL_URL=https://your-name.app.n8n.cloud/webhook/chat-poll
VITE_N8N_MATCH_END_URL=https://your-name.app.n8n.cloud/webhook/match-end
```

**注意**：把 `your-name` 换成你的实际 n8n subdomain

---

## 📋 我需要你提供的信息

为了帮你完成自动部署，请给我：

1. **n8n Base URL**: `https://___your-name___.app.n8n.cloud`
2. **Google Sheet ID**: 你从 Sheet URL 复制的 ID

有这两个，我就能帮你自动部署工作流并生成完整的 .env 文件！

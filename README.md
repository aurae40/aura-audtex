# AuRA_AuDTEX — The Illuminated Audio Transcriber & Cognitive Copilot

> An offline-first, audio-synchronized knowledge reader that transforms spoken `.mp3` audio into a living book page with real-time cognitive marginalia, personal reflections database, and milestone author intent synthesis.

---

## 🌟 Core Features

1. **Brand Identity: AuRA_AuDTEX**:
   - High-fidelity typography (**Cinzel** headings + **Lora** book serif).
   - Dynamic Island acoustic pulse visualization.
2. **Personal Reflection & Annotation Database (`ReflectionsTab.tsx`)**:
   - **Timestamp-Anchored Notes**: Each annotation is locked to the exact audio second and page number.
   - **Click-to-Seek**: Clicking any reflection in your database immediately jumps audio playback to that moment.
   - **Highlighted Excerpts**: Attach quote excerpts from the spoken text.
   - **Categorized Tags**: 💡 Insight, ❓ Question, ⚠️ Critique, 🎯 Action Item.
   - **Color-Coded Margin Marks**: Gold, Emerald, Cyan, Rose, Purple.
   - **Instant Search & Filter**: Filter by keyword or tag.
   - **1-Click Export**: Export your entire personal database to Markdown or Notion.
   - **Local Persistence**: Automatically saves to `localStorage` (or `IndexedDB`).
3. **Synchronized Word-Level Reader (`BookReader.tsx`)**:
   - Real-time word illumination (`.word-active`) tracking acoustic cadence.
   - Click any word on the parchment to seek playback to that exact split-second.
   - Red silk ribbon bookmark with realistic depth.
   - Quick-reflect trigger button on the book page.
   - Floating **Glanceable Insight Pill** positioned above the player bar.
4. **Synchronized Marginalia Drawer (`InsightsDrawer.tsx`)**:
   - 📌 **Main Idea Distillation** in plain words.
   - 💡 **Jargon & Concept Decoder** explaining dense terminology.
   - 🌍 **Real-World Example & Analogy** grounding theory in reality.
   - 🔗 **Connected Ideas Network** with clickable theme tags.
5. **The Page 10 Milestone Author Dossier (`AuthorDossier.tsx`)**:
   - Macro synthesis unlocked at Word #2,800 (Minute 19:43).
   - 🎭 **The Unspoken Subtext**: Reading between the lines.
   - 🏛️ **Thesis Evolution Arc**: Tracking how the argument shifted across pages 1 to 10.
   - ⚡ **Real-World Actionable Translation**: Immediate takeaways.
   - **Spaced Repetition Flashcards**: One-click Markdown/Anki export.
6. **Interactive Concept Topology (`ConceptMap.tsx`)**:
   - Visual network graph of themes spoken across the audio file.
   - Click any concept node to immediately jump the audio to when it was uttered.
7. **Epic Theme & Custom Color Engine (`SkinsDrawer.tsx`, `themes.ts`)**:
   - 👑 **Imperial Obsidian & Gold**
   - 📜 **Royal Library Mahogany**
   - 🌌 **Cyber Midnight Tokyo**
   - 🌿 **Nordic Sage & Moss**
   - ⚪ **E-Ink Minimalist Scholar**
   - 🎨 **Live Hex / RGB Color Wheel**: Real-time custom accent customization.
8. **Tactile Glass Player Bar (`PlayerBar.tsx`)**:
   - Scrubber with bright red pin at Page 10 Milestone (19:43).
   - `-10s` and `+10s` instant skip buttons.
   - Pitch-corrected speed dial (`0.75×` to `2.0×`).
   - 🌧️ **Generative Web Audio Ambience**: Soft library rain and vinyl crackle soundscape.

---

## 🚀 Running the App

### Live Local Dev Server
```powershell
cd D:\codex-audio
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### Single-File Standalone Bundle
Double-click `dist/index.html` in Windows Explorer. It requires zero server setup and runs completely offline.

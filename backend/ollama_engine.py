"""
AuRA_AuDTEX Free Local LLM Intelligence Engine (Ollama Structured Outputs)
Zero paid API keys. Auto-detects any locally installed Ollama model on your PC
(GPU or CPU) and generates audio-grounded Marginalia, Author Dossiers, and
timestamp-cited "Ask This Audio" answers using Ollama's JSON Schema format.
"""

import os
import json
import asyncio
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
PREFERRED_MODEL_PREFIXES = (
    "qwen3",
    "qwen2.5",
    "llama3.3",
    "llama3.2",
    "llama3.1",
    "llama3",
    "gemma3",
    "gemma2",
    "mistral",
    "phi4",
    "phi3",
    "deepseek",
)
EMBEDDING_ONLY_KEYWORDS = ("embed", "bge", "minilm", "rerank", "whisper")


def _http_json(url: str, payload: Optional[Dict[str, Any]] = None, timeout: float = 3.0) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def detect_ollama_status_sync() -> Dict[str, Any]:
    """Probes local Ollama daemon and selects the best available chat/instruct model."""
    forced_model = os.environ.get("AURA_OLLAMA_MODEL", "").strip()
    try:
        tags = _http_json(f"{OLLAMA_HOST}/api/tags", timeout=1.5)
        raw_models = [m.get("name", "") for m in tags.get("models", []) if m.get("name")]
        chat_models = [
            m for m in raw_models if not any(bad in m.lower() for bad in EMBEDDING_ONLY_KEYWORDS)
        ]

        if not chat_models:
            return {
                "online": False,
                "host": OLLAMA_HOST,
                "model": None,
                "available_models": [],
                "reason": "Ollama is running but no chat model is pulled (run: ollama pull qwen2.5:7b or llama3.2:3b).",
            }

        selected = None
        if forced_model and forced_model in chat_models:
            selected = forced_model
        else:
            for prefix in PREFERRED_MODEL_PREFIXES:
                match = next((m for m in chat_models if m.lower().startswith(prefix)), None)
                if match:
                    selected = match
                    break
            if not selected:
                selected = chat_models[0]

        return {
            "online": True,
            "host": OLLAMA_HOST,
            "model": selected,
            "available_models": chat_models,
        }
    except Exception as exc:
        return {
            "online": False,
            "host": OLLAMA_HOST,
            "model": None,
            "available_models": [],
            "reason": str(exc),
        }


async def detect_ollama_status() -> Dict[str, Any]:
    return await asyncio.to_thread(detect_ollama_status_sync)


def format_mmss(sec: float) -> str:
    sec = max(0.0, float(sec))
    m = int(sec // 60)
    s = int(sec % 60)
    return f"{m:02d}:{s:02d}"


def build_timestamped_transcript_blocks(
    tokens: List[Dict[str, Any]],
    max_chars: int = 12000,
) -> str:
    """
    Compresses word tokens into clean [MM:SS] paragraph blocks.
    For very long recordings, samples evenly across beginning, middle, and end
    so local GPU VRAM stays fast and never overflows context.
    """
    if not tokens:
        return ""

    blocks: List[str] = []
    cur_words: List[str] = []
    cur_start = float(tokens[0].get("start", 0.0))

    for idx, tok in enumerate(tokens):
        w = str(tok.get("word", "")).strip()
        if not w:
            continue
        cur_words.append(w)
        is_end = w.endswith((".", "?", "!"))
        next_gap = (
            float(tokens[idx + 1].get("start", 0.0)) - float(tok.get("end", 0.0))
            if idx + 1 < len(tokens)
            else 0.0
        )
        if (is_end and len(cur_words) >= 24) or len(cur_words) >= 48 or next_gap > 1.8 or idx == len(tokens) - 1:
            blocks.append(f"[{format_mmss(cur_start)}] {' '.join(cur_words)}")
            cur_words = []
            if idx + 1 < len(tokens):
                cur_start = float(tokens[idx + 1].get("start", cur_start))

    full_text = "\n".join(blocks)
    if len(full_text) <= max_chars:
        return full_text

    # Evenly stratified sampling across the entire recording timeline
    stride = max(1, len(blocks) // 36)
    sampled = [blocks[i] for i in range(0, len(blocks), stride)]
    if blocks[-1] not in sampled:
        sampled.append(blocks[-1])
    return "\n".join(sampled)[:max_chars]


ANALYSIS_JSON_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "marginalia": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "thresholdTime": {"type": "number"},
                    "mainIdea": {"type": "string"},
                    "conceptTerm": {"type": "string"},
                    "conceptExplanation": {"type": "string"},
                    "realWorldExample": {"type": "string"},
                    "connectedTags": {"type": "array", "items": {"type": "string"}},
                },
                "required": [
                    "thresholdTime",
                    "mainIdea",
                    "conceptTerm",
                    "conceptExplanation",
                    "realWorldExample",
                    "connectedTags",
                ],
            },
        },
        "dossier": {
            "type": "object",
            "properties": {
                "unspokenSubtext": {"type": "string"},
                "subtextScore": {"type": "string"},
                "thesisSteps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "pages": {"type": "string"},
                            "description": {"type": "string"},
                        },
                        "required": ["pages", "description"],
                    },
                },
                "actionableBridge": {"type": "string"},
                "studyFlashcards": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "q": {"type": "string"},
                            "a": {"type": "string"},
                        },
                        "required": ["q", "a"],
                    },
                },
            },
            "required": [
                "unspokenSubtext",
                "subtextScore",
                "thesisSteps",
                "actionableBridge",
                "studyFlashcards",
            ],
        },
    },
    "required": ["marginalia", "dossier"],
}


ASK_JSON_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "not_found"]},
        "citations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "timestampSec": {"type": "number"},
                    "quote": {"type": "string"},
                    "relevance": {"type": "string"},
                },
                "required": ["timestampSec", "quote", "relevance"],
            },
        },
        "followUpQuestions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["answer", "confidence", "citations", "followUpQuestions"],
}


def _call_ollama_structured_sync(
    model: str,
    system_prompt: str,
    user_prompt: str,
    schema: Dict[str, Any],
    timeout: float = 90.0,
) -> Dict[str, Any]:
    payload = {
        "model": model,
        "stream": False,
        "format": schema,
        "options": {
            "temperature": 0.1,
            "num_ctx": 8192,
        },
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    res = _http_json(f"{OLLAMA_HOST}/api/chat", payload=payload, timeout=timeout)
    content = res.get("message", {}).get("content", "{}")
    return json.loads(content)


async def generate_ollama_analysis(
    title: str,
    tokens: List[Dict[str, Any]],
    duration: float,
    lens: str = "codex",
    preferred_model: Optional[str] = None,
) -> Dict[str, Any]:
    """Generates real recording-grounded Marginalia & Author Dossier via local Ollama."""
    status = await detect_ollama_status()
    if not status["online"] or not status["model"]:
        raise RuntimeError(status.get("reason") or "Local Ollama is not available.")

    model = preferred_model if preferred_model in status["available_models"] else status["model"]
    transcript_text = build_timestamped_transcript_blocks(tokens, max_chars=11500)

    lens_instruction = {
        "meeting": "Focus on decisions made, action items with owners/deadlines, open questions, and risks.",
        "study": "Focus on core definitions, causal mechanisms, likely exam questions, and concrete examples.",
        "codex": "Focus on the speaker's core thesis, unspoken subtext, key conceptual terms, and real-world synthesis.",
    }.get(lens, "Focus on the speaker's core thesis, key concepts, and actionable synthesis.")

    system_prompt = (
        "You are AuRA Cognitive Synthesizer, an exact, source-grounded analyst. "
        "ONLY use facts actually spoken in the provided timestamped transcript. "
        "Never invent quotes, statistics, or claims not present in the transcript. "
        f"{lens_instruction} Return valid JSON strictly matching the schema."
    )

    user_prompt = (
        f"Recording Title: {title}\n"
        f"Total Duration Seconds: {round(duration, 1)}\n\n"
        f"TIMESTAMPED TRANSCRIPT:\n{transcript_text}\n\n"
        "Instructions:\n"
        "1. Produce 3 to 5 chronological marginalia milestones distributed across the recording's real timestamps (thresholdTime in seconds between 0 and total duration).\n"
        "2. Each marginalia must summarize the ACTUAL argument spoken near that timestamp, decode one REAL term/concept used by the speaker, give a grounded realWorldExample, and 2-4 specific connectedTags.\n"
        "3. Produce a Milestone Dossier with: unspokenSubtext (what the speaker implies beneath the surface), subtextScore (short 2-4 word tone label like 'Analytical & Urgent'), 3 chronological thesisSteps (using real time ranges like '00:00–02:15'), one concrete actionableBridge, and 3-4 high-value studyFlashcards testing ideas actually spoken in the recording."
    )

    raw = await asyncio.to_thread(
        _call_ollama_structured_sync,
        model,
        system_prompt,
        user_prompt,
        ANALYSIS_JSON_SCHEMA,
    )

    marginalia_out = []
    for item in raw.get("marginalia", [])[:6]:
        ts = max(0.0, min(duration, float(item.get("thresholdTime", 0.0))))
        marginalia_out.append({
            "thresholdTime": round(ts, 1),
            "mainIdea": str(item.get("mainIdea", "")).strip(),
            "conceptDecoder": {
                "term": str(item.get("conceptTerm", "Key Concept")).strip(),
                "explanation": str(item.get("conceptExplanation", "")).strip(),
            },
            "realWorldExample": str(item.get("realWorldExample", "")).strip(),
            "connectedTags": [str(t).strip() for t in item.get("connectedTags", [])[:4] if str(t).strip()],
        })

    marginalia_out.sort(key=lambda m: m["thresholdTime"])

    raw_d = raw.get("dossier", {})
    milestone_sec = round(duration * 0.7, 1)
    dossier_out = {
        "pageNumber": 10,
        "wordCountTrigger": min(2500, len(tokens)),
        "audioTimestampSec": milestone_sec,
        "timeFormatted": format_mmss(milestone_sec),
        "unspokenSubtext": str(raw_d.get("unspokenSubtext", "")).strip(),
        "subtextScore": str(raw_d.get("subtextScore", "Source-Grounded Synthesis")).strip(),
        "thesisSteps": [
            {
                "pages": str(step.get("pages", "Section")).strip(),
                "description": str(step.get("description", "")).strip(),
            }
            for step in raw_d.get("thesisSteps", [])[:5]
        ],
        "actionableBridge": str(raw_d.get("actionableBridge", "")).strip(),
        "studyFlashcards": [
            {
                "q": str(c.get("q", "")).strip(),
                "a": str(c.get("a", "")).strip(),
            }
            for c in raw_d.get("studyFlashcards", [])[:5]
            if c.get("q") and c.get("a")
        ],
    }

    return {
        "engine": "ollama",
        "model": model,
        "marginalia": marginalia_out,
        "dossier": dossier_out,
    }


async def answer_question_with_ollama(
    question: str,
    title: str,
    passages: List[Dict[str, Any]],
    duration: float,
    preferred_model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Answers a user question strictly grounded in BM25-retrieved timestamped passages
    from the recording, returning clickable [MM:SS] audio citations.
    """
    status = await detect_ollama_status()
    if not status["online"] or not status["model"]:
        raise RuntimeError(status.get("reason") or "Local Ollama is not available.")

    model = preferred_model if preferred_model in status["available_models"] else status["model"]

    evidence_lines = []
    for p in passages[:8]:
        ts = float(p.get("startSec", 0.0))
        evidence_lines.append(f"[{format_mmss(ts)} | {round(ts, 1)}s] {p.get('text', '')}")
    evidence_block = "\n".join(evidence_lines)

    system_prompt = (
        "You are AuRA Audio Source Assistant. Answer the user's question ONLY using the "
        "provided timestamped audio excerpts. Never guess or hallucinate external facts. "
        "If the excerpts do not contain the answer, set confidence to 'not_found' and say so plainly. "
        "Every citation must copy the exact timestampSec (number in seconds) and a short verbatim quote from the excerpts. "
        "Return strict JSON matching the schema."
    )

    user_prompt = (
        f"Recording: {title}\n"
        f"User Question: {question}\n\n"
        f"RETRIEVED AUDIO EXCERPTS:\n{evidence_block}\n\n"
        "Answer clearly and concisely, cite 1 to 4 exact timestamps from the excerpts, "
        "and suggest 2 helpful follow-up questions about this recording."
    )

    raw = await asyncio.to_thread(
        _call_ollama_structured_sync,
        model,
        system_prompt,
        user_prompt,
        ASK_JSON_SCHEMA,
        timeout=60.0,
    )

    citations = []
    for c in raw.get("citations", [])[:4]:
        ts = max(0.0, min(duration if duration > 0 else 999999.0, float(c.get("timestampSec", 0.0))))
        citations.append({
            "timestampSec": round(ts, 1),
            "timeFormatted": format_mmss(ts),
            "quote": str(c.get("quote", "")).strip(),
            "relevance": str(c.get("relevance", "")).strip(),
        })

    return {
        "engine": "ollama",
        "model": model,
        "answer": str(raw.get("answer", "")).strip(),
        "confidence": raw.get("confidence", "medium"),
        "citations": citations,
        "followUpQuestions": [str(q).strip() for q in raw.get("followUpQuestions", [])[:3] if str(q).strip()],
    }

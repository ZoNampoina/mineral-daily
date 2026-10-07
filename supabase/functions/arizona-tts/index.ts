import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const OPENAI_VOICES = ["cedar","marin","onyx","ash","echo","fable","verse","alloy","ballad","coral","nova","sage","shimmer"];
const PROMPT_VERSION = "documentary-premium-v2";
const AUDIO_VERSION = "segments-v2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function modeOf(v: unknown) {
  const s = String(v || "daily");
  return ["short", "daily", "deep"].includes(s) ? s : "daily";
}

function providerStatus() {
  return {
    openai: !!Deno.env.get("OPENAI_API_KEY"),
    elevenlabs: !!Deno.env.get("ELEVENLABS_API_KEY"),
  };
}

function chooseProvider(requested: string) {
  const s = providerStatus();
  if (requested === "openai") return s.openai ? "openai" : null;
  if (requested === "elevenlabs") return s.elevenlabs ? "elevenlabs" : null;
  if (s.openai) return "openai";
  if (s.elevenlabs) return "elevenlabs";
  return null;
}

function hasAuthenticatedJwt(req: Request) {
  const raw = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const part = raw.split(".")[1] || "";
  if (!part) return false;
  try {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - part.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return payload?.role === "authenticated" && !!payload?.sub;
  } catch {
    return false;
  }
}

function getAdminClient() {
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const adminKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(Deno.env.get("SUPABASE_URL")!, adminKey!);
}

function wordCount(s: string) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function targetWords(mode: string) {
  if (mode === "short") return { min: 230, max: 300, target: 265 };
  if (mode === "deep") return { min: 1050, max: 1400, target: 1220 };
  return { min: 590, max: 760, target: 675 };
}

function normalizeForSpeech(input: string) {
  let s = String(input || "");
  const replacements: Array<[RegExp,string]> = [
    [/\bBCMM\b/g, "B C M M"],
    [/\bAERP\b/g, "A E R P"],
    [/\bPRSE\b/g, "P R S E"],
    [/\bPEE\b/g, "P E E"],
    [/\bEMAPE\b/g, "E M A P E"],
    [/\bTREO\b/g, "teneur totale en oxydes de terres rares"],
    [/\bLREE\b/g, "terres rares légères"],
    [/\bREE\b/g, "terres rares"],
    [/\bREO\b/g, "oxydes de terres rares"],
    [/\bNd[-–]Pr\b/g, "néodyme et praséodyme"],
    [/\bNd2O3\b/g, "oxyde de néodyme"],
    [/\bPr6O11\b/g, "oxyde de praséodyme"],
    [/\bCePO4\b/g, "phosphate de cérium"],
    [/\bNd[-–]Fe[-–]B\b/g, "néodyme fer bore"],
    [/\bCu\b/g, "cuivre"], [/\bNi\b/g, "nickel"], [/\bCo\b/g, "cobalt"], [/\bLi\b/g, "lithium"],
    [/\bPt\b/g, "platine"], [/\bPd\b/g, "palladium"], [/\bCe\b/g, "cérium"], [/\bLa\b/g, "lanthane"],
    [/\bNd\b/g, "néodyme"], [/\bPr\b/g, "praséodyme"], [/\bSm\b/g, "samarium"],
    [/\bUSD\/kg\b/gi, "dollars américains par kilogramme"],
    [/\bMGA\/USD\b/gi, "ariarys par dollar américain"],
    [/\bAr\/kg\b/gi, "ariarys par kilogramme"],
    [/\bg\/cm(?:3|³)\b/gi, "grammes par centimètre cube"],
    [/(\d[\d\s.,]*)\s*%/g, "$1 pour cent"],
    [/(\d[\d\s.,]*)\s*kg\b/gi, "$1 kilogrammes"],
    [/(\d[\d\s.,]*)\s*t\b/g, "$1 tonnes"],
  ];
  for (const [re, v] of replacements) s = s.replace(re, v);
  return s.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

const roleDirections: Record<string,string> = {
  hook: "[curious, engaging, warm documentary narration]",
  introduction: "[calm, confident, measured documentary narration]",
  context: "[calm, grounded, measured]",
  explanation: "[clear, pedagogical, natural, precise]",
  important: "[confident, slightly emphatic, controlled]",
  number: "[slower, deliberate, precise articulation]",
  madagascar: "[focused, grounded, locally relevant]",
  transition: "[light, fluid, understated]",
  takeaway: "[clear, concise, memorable]",
  conclusion: "[calm, reflective, memorable]",
};

function directionTag(segment: any) {
  return roleDirections[String(segment?.role || "explanation")] || roleDirections.explanation;
}

function fallbackNarrative(legacyText: string, mode: string, title = "Fiche ARIZONA") {
  const sentences = String(legacyText || "").match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
  const desired = mode === "short" ? 5 : mode === "deep" ? 9 : 7;
  const size = Math.max(1, Math.ceil(sentences.length / desired));
  const roles = mode === "short"
    ? ["hook","context","important","takeaway","conclusion"]
    : mode === "deep"
      ? ["hook","introduction","context","explanation","number","madagascar","important","takeaway","conclusion"]
      : ["hook","context","explanation","number","madagascar","takeaway","conclusion"];
  const segments = [];
  for (let i = 0; i < desired; i++) {
    const chunk = sentences.slice(i * size, (i + 1) * size).join(" ").trim();
    if (!chunk) continue;
    segments.push({
      id: String(i + 1).padStart(2, "0") + "_" + roles[i],
      role: roles[i],
      direction: roles[i],
      spoken_text: chunk,
    });
  }
  return { title, summary: "Narration de secours", segments };
}

const narrativeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          role: { type: "string", enum: ["hook","introduction","context","explanation","important","number","madagascar","transition","takeaway","conclusion"] },
          direction: { type: "string" },
          spoken_text: { type: "string" },
        },
        required: ["id","role","direction","spoken_text"],
      },
    },
  },
  required: ["title","summary","segments"],
};

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  for (const item of data?.output || []) {
    for (const c of item?.content || []) {
      if ((c?.type === "output_text" || c?.type === "text") && typeof c?.text === "string") return c.text.trim();
    }
  }
  return "";
}

async function generateNarrative(sourceText: string, legacyText: string, mode: string, lessonName: string, lessonDate: string, cacheKey: string, sourceHash: string) {
  const supabase = getAdminClient();
  const cached = await supabase.from("arizona_audio_narratives").select("narrative,narrative_model").eq("cache_key", cacheKey).maybeSingle();
  if (cached.data?.narrative) return { narrative: cached.data.narrative, model: cached.data.narrative_model || "cache", cached: true };

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { narrative: fallbackNarrative(legacyText, mode, lessonName), model: "fallback", cached: false };

  const budget = targetWords(mode);
  const segmentTarget = mode === "short" ? "5 à 6" : mode === "deep" ? "8 à 10" : "7 à 9";
  const developer = `Tu es le scénariste audio d'ARIZONA, une application professionnelle d'ingénierie minière. Transforme une fiche factuelle en narration française naturelle, conçue pour être écoutée et non lue. N'invente AUCUN fait, chiffre, causalité, exemple, date, lieu ou conclusion absent de la source. Tu peux reformuler, hiérarchiser, expliquer les relations déjà présentes et supprimer les détails secondaires. Évite les longues listes, le style télégraphique, les répétitions et les introductions stéréotypées. Les chiffres importants doivent être contextualisés et faciles à comprendre à l'oral. Les phrases doivent être plutôt courtes et variées. Le ton est celui d'un bon documentaire scientifique: crédible, humain, précis, sans emphase théâtrale. Si la source contient un angle Madagascar pertinent, conserve-le. La conclusion doit laisser 2 à 4 idées mémorables. Ne lis pas les titres de sections de la fiche. Les segments doivent s'enchaîner naturellement.`;
  const user = `Créer le format ${mode} pour « ${lessonName} » (${lessonDate || "date non précisée"}). Vise environ ${budget.target} mots, dans une plage de ${budget.min} à ${budget.max} mots. Utilise ${segmentTarget} segments. Le premier segment doit accrocher sans sensationnalisme. Un segment de rôle "number" doit être utilisé seulement si un chiffre réellement important existe. Le texte de chaque segment doit être immédiatement prononçable par un TTS.\n\nSOURCE FACTUELLE UNIQUE:\n${sourceText}`;

  const candidates = Array.from(new Set([Deno.env.get("ARIZONA_NARRATIVE_MODEL") || "gpt-6.1-sol", "gpt-6-luna"]));
  let lastError = "";
  for (const model of candidates) {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: "low" },
          max_output_tokens: mode === "deep" ? 5000 : 3500,
          input: [
            { role: "developer", content: developer },
            { role: "user", content: user },
          ],
          text: { format: { type: "json_schema", name: "arizona_documentary", strict: true, schema: narrativeSchema } },
        }),
      });
      if (!r.ok) { lastError = `OPENAI_SCRIPT_${r.status}: ${(await r.text()).slice(0,800)}`; continue; }
      const data = await r.json();
      const out = extractOutputText(data);
      if (!out) { lastError = "OPENAI_SCRIPT_EMPTY"; continue; }
      const narrative = JSON.parse(out);
      const wc = (narrative?.segments || []).reduce((n: number, s: any) => n + wordCount(s?.spoken_text || ""), 0);
      if (!Array.isArray(narrative?.segments) || narrative.segments.length < 4 || wc < Math.max(150, budget.min * .65)) {
        lastError = "OPENAI_SCRIPT_TOO_SHORT";
        continue;
      }
      await supabase.from("arizona_audio_narratives").upsert({
        cache_key: cacheKey,
        lesson_id: String(cacheKey.split(":")[0] || "unknown"),
        mode,
        profile: PROMPT_VERSION,
        source_hash: sourceHash,
        narrative,
        narrative_model: model,
        updated_at: new Date().toISOString(),
      }, { onConflict: "cache_key" });
      return { narrative, model, cached: false };
    } catch (e) {
      lastError = String(e instanceof Error ? e.message : e);
    }
  }
  console.warn("Narrative generation fallback", lastError);
  return { narrative: fallbackNarrative(legacyText, mode, lessonName), model: "fallback", cached: false, error: lastError };
}

async function openaiTTS(text: string, voice: string, instructions: string) {
  const key = Deno.env.get("OPENAI_API_KEY")!;
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: OPENAI_VOICES.includes(voice) ? voice : "cedar",
      input: text,
      instructions,
      response_format: "mp3",
      speed: 1,
    }),
  });
  if (!r.ok) throw new Error(`OPENAI_TTS_${r.status}: ${(await r.text()).slice(0,800)}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function elevenV4(text: string, voiceId: string) {
  const key = Deno.env.get("ELEVENLABS_API_KEY")!;
  const r = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Accept": "audio/mpeg", "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: "eleven_v4",
      inputs: [{ text, voice_id: voiceId }],
    }),
  });
  if (!r.ok) throw new Error(`ELEVEN_V4_${r.status}: ${(await r.text()).slice(0,800)}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function cachedAudioUrl(path: string) {
  const supabase = getAdminClient();
  const signed = await supabase.storage.from("arizona-audio").createSignedUrl(path, 60 * 60 * 24);
  if (!signed.data?.signedUrl) return null;
  const probe = await fetch(signed.data.signedUrl, { method: "HEAD" });
  return probe.ok ? signed.data.signedUrl : null;
}

async function storeAudio(path: string, audio: Uint8Array) {
  const supabase = getAdminClient();
  const up = await supabase.storage.from("arizona-audio").upload(path, audio, {
    contentType: "audio/mpeg",
    cacheControl: "31536000",
    upsert: true,
  });
  if (up.error) throw new Error(`STORAGE_UPLOAD_FAILED: ${up.error.message}`);
  const signed = await supabase.storage.from("arizona-audio").createSignedUrl(path, 60 * 60 * 24);
  if (!signed.data?.signedUrl) throw new Error("SIGNED_URL_FAILED");
  return signed.data.signedUrl;
}

function classifyTtsError(provider: string, error: unknown) {
  const raw = String(error instanceof Error ? error.message : error || "");
  const s = raw.toLowerCase();
  let code = provider === "elevenlabs" ? "ELEVENLABS_TTS_FAILED" : "OPENAI_TTS_FAILED";
  if (/insufficient[_ -]?credits|quota|credit balance|not enough credits/.test(s)) code = provider === "elevenlabs" ? "ELEVENLABS_INSUFFICIENT_CREDITS" : "OPENAI_QUOTA";
  else if (/429|rate[_ -]?limit|too many requests|concurrency/.test(s)) code = provider === "elevenlabs" ? "ELEVENLABS_RATE_LIMIT" : "OPENAI_RATE_LIMIT";
  else if (/401|unauthorized|invalid api key|incorrect api key/.test(s)) code = provider === "elevenlabs" ? "ELEVENLABS_AUTH" : "OPENAI_AUTH";
  else if (/403|forbidden|permission|not allowed/.test(s)) code = provider === "elevenlabs" ? "ELEVENLABS_PERMISSION" : "OPENAI_PERMISSION";
  return { provider, code, detail: raw.slice(0, 900) };
}

async function generateSegmentAudio(segment: any, provider: string, voiceKey: string, lessonId: string, mode: string) {
  const normalized = normalizeForSpeech(segment.spoken_text);
  const tag = directionTag(segment);
  const audioText = provider === "elevenlabs" ? `${tag} ${normalized}` : normalized;
  const hash = await sha256(JSON.stringify({
    v: AUDIO_VERSION,
    provider,
    voiceKey,
    mode,
    role: segment.role,
    direction: segment.direction,
    text: audioText,
  }));
  const safeId = String(segment.id || "segment").replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${lessonId}/${mode}/${PROMPT_VERSION}/${provider}/${voiceKey}/${safeId}-${hash}.mp3`;
  const hit = await cachedAudioUrl(path);
  if (hit) return {
    ...segment, spoken_text: normalized, url: hit, cached: true,
    provider, model_id: provider === "elevenlabs" ? "eleven_v4" : "gpt-4o-mini-tts",
    estimated_seconds: Math.max(8, Math.round(wordCount(normalized) / 2.15))
  };

  let audio: Uint8Array;
  let model = "";
  if (provider === "elevenlabs") {
    audio = await elevenV4(audioText, voiceKey);
    model = "eleven_v4";
  } else {
    const instructions = `Speak in French as a natural male premium documentary narrator. ${segment.direction || "Clear, measured and professional."} Vary intonation naturally, articulate technical vocabulary and numbers precisely, and avoid synthetic assistant cadence.`;
    audio = await openaiTTS(normalized, voiceKey, instructions);
    model = "gpt-4o-mini-tts";
  }
  const url = await storeAudio(path, audio);
  return {
    ...segment, spoken_text: normalized, url, cached: false,
    provider, model_id: model,
    estimated_seconds: Math.max(8, Math.round(wordCount(normalized) / 2.15))
  };
}

async function generateSegmentWithFallback(
  segment: any,
  providers: string[],
  voices: Record<string,string>,
  lessonId: string,
  mode: string
) {
  const attempts: any[] = [];
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const voiceKey = voices[provider];
    try {
      const result = await generateSegmentAudio(segment, provider, voiceKey, lessonId, mode);
      return {
        ...result,
        fallback_used: i > 0,
        primary_provider: providers[0],
        attempts
      };
    } catch (e) {
      const failure = classifyTtsError(provider, e);
      attempts.push(failure);
      console.warn("ARIZONA segment TTS failed", segment?.id, failure.code, failure.detail);
    }
  }
  const err = new Error("ALL_TTS_PROVIDERS_FAILED");
  (err as any).attempts = attempts;
  (err as any).segmentId = String(segment?.id || "");
  throw err;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "status");
  const status = providerStatus();

  if (action === "generate" && !hasAuthenticatedJwt(req)) {
    return json({ error: "AUTH_REQUIRED" }, 401);
  }

  if (action === "status") {
    return json({
      configured: status.openai || status.elevenlabs,
      providers: status,
      preferred: status.openai ? "openai" : status.elevenlabs ? "elevenlabs" : null,
      documentary_premium: {
        version: PROMPT_VERSION,
        narrative: status.openai ? "gpt-6.1-sol" : "fallback",
        tts: status.openai ? "gpt-4o-mini-tts" : status.elevenlabs ? "eleven_v4" : null,
        voice: status.openai ? (Deno.env.get("OPENAI_TTS_VOICE") || "cedar") : null,
        fallback_chain: [
          ...(status.openai ? ["openai"] : []),
          ...(status.elevenlabs ? ["elevenlabs"] : []),
        ],
        segment_resume: true,
      },
    });
  }

  if (action === "voices") {
    const provider = chooseProvider(String(body?.provider || "auto"));
    if (!provider) return json({ configured: false, providers: status, error: "NO_TTS_PROVIDER" }, 503);

    if (provider === "openai") {
      return json({ configured: true, provider: "openai", voices: OPENAI_VOICES.map(name => ({
        voice_id: name, name, category: "openai", preview_url: null,
        labels: { provider: "OpenAI", language: "multilingual" },
      })) });
    }

    const key = Deno.env.get("ELEVENLABS_API_KEY")!;
    const vr = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key, "Accept": "application/json" } });
    if (!vr.ok) return json({ error: "VOICE_LIST_FAILED", detail: await vr.text() }, vr.status);
    const data = await vr.json();
    return json({ configured: true, provider: "elevenlabs", voices: (data?.voices || []).map((v: any) => ({
      voice_id: v.voice_id, name: v.name, category: v.category, preview_url: v.preview_url,
      labels: v.labels || {}, description: v.description || "",
    })) });
  }

  if (action !== "generate") return json({ error: "Unknown action" }, 400);

  const legacyText = String(body?.text || "").trim();
  const sourceText = String(body?.source_text || legacyText).trim();
  const mode = modeOf(body?.mode);
  const lessonId = String(body?.lesson_id || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
  const lessonName = String(body?.lesson_name || "Fiche ARIZONA").trim();
  const lessonDate = String(body?.lesson_date || "").trim();
  if (!sourceText && !legacyText) return json({ error: "Text required" }, 400);

  const requestedProvider = String(body?.provider || "auto");
  const primaryProvider = chooseProvider(requestedProvider);
  if (!primaryProvider) return json({ configured: false, providers: status, error: "NO_TTS_PROVIDER" }, 503);

  const rawVoice = String(body?.voice_id || "");
  const openaiVoice = OPENAI_VOICES.includes(String(body?.openai_voice_id || rawVoice))
    ? String(body?.openai_voice_id || rawVoice)
    : String(body?.openai_voice_id || Deno.env.get("OPENAI_TTS_VOICE") || "cedar");
  const elevenVoice = String(body?.elevenlabs_voice_id || rawVoice || Deno.env.get("ELEVENLABS_VOICE_ID") || "JBFqnCBsd6RMkjVDRZzb");

  const providers = requestedProvider === "elevenlabs"
    ? (status.elevenlabs ? ["elevenlabs"] : status.openai ? ["openai"] : [])
    : [
        ...(status.openai ? ["openai"] : []),
        ...(status.elevenlabs ? ["elevenlabs"] : []),
      ];
  const voices: Record<string,string> = {
    elevenlabs: elevenVoice,
    openai: openaiVoice,
  };

  const sourceHash = await sha256(sourceText);
  const narrativeCacheKey = `${lessonId}:${mode}:${PROMPT_VERSION}:${sourceHash}`;
  const narrativeResult = await generateNarrative(sourceText, legacyText || sourceText, mode, lessonName, lessonDate, narrativeCacheKey, sourceHash);
  const narrative = narrativeResult.narrative;

  try {
    const segments = [];
    for (const segment of (narrative?.segments || [])) {
      segments.push(await generateSegmentWithFallback(segment, providers, voices, lessonId, mode));
    }
    if (!segments.length) return json({ error: "NO_SEGMENTS" }, 500);

    const providersUsed = Array.from(new Set(segments.map((s: any) => s.provider).filter(Boolean)));
    const fallbackSegments = segments.filter((s: any) => s.fallback_used);
    const provider = providersUsed.length > 1 ? "mixed" : (providersUsed[0] || primaryProvider);
    const modelIds = Array.from(new Set(segments.map((s: any) => s.model_id).filter(Boolean)));

    return json({
      configured: true,
      premium: true,
      version: PROMPT_VERSION,
      provider,
      providers_used: providersUsed,
      fallback_chain: providers,
      fallback_segments: fallbackSegments.map((s: any) => ({
        id: s.id,
        role: s.role,
        provider: s.provider,
        attempts: s.attempts || [],
      })),
      fallback_count: fallbackSegments.length,
      model_id: modelIds.length > 1 ? "mixed" : (modelIds[0] || ""),
      narrative_model: narrativeResult.model,
      narrative_cached: narrativeResult.cached,
      voice_id: provider === "elevenlabs" ? elevenVoice : provider === "openai" ? openaiVoice : "mixed",
      mode,
      title: narrative?.title || lessonName,
      summary: narrative?.summary || "",
      segments,
      duration_estimate: segments.reduce((n: number, s: any) => n + Number(s.estimated_seconds || 0), 0),
      cache: {
        segments_cached: segments.filter((s: any) => s.cached).length,
        total_segments: segments.length,
        fallback_segments: fallbackSegments.length,
      },
    });
  } catch (e) {
    const attempts = (e as any)?.attempts || [];
    return json({
      error: "TTS_FAILED",
      failed_segment: (e as any)?.segmentId || null,
      fallback_chain: providers,
      attempts,
      detail: String(e instanceof Error ? e.message : e).slice(0, 1200),
    }, 502);
  }
});

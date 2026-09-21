/**
 * share.js — Discord Embedded Activity: Sala de Tela
 * Integra https://streaming.storb.lol/ dentro do Discord
 */

const CLIENT_ID = "1550711614221582346";

// Proxy: requests para streaming.storb.lol passam pelo Vercel
const URL_MAPPINGS = [
  { prefix: "/.proxy/storb", target: "streaming.storb.lol" },
];

const STREAMING_URL = "https://streaming.storb.lol/";

(async function init() {
  try {
    // ── 1. Localiza o SDK no bundle ──────────────────────────────────────
    const SDKModule =
      window.DiscordSDK ||
      window["@discord/embedded-app-sdk"] ||
      (typeof DiscordSDK !== "undefined" ? { DiscordSDK, patchUrlMappings } : null);

    if (!SDKModule) {
      console.warn("Discord SDK nao encontrado. Abrindo site direto.");
      loadFrame(STREAMING_URL);
      return;
    }

    const { DiscordSDK: SDK, patchUrlMappings } = SDKModule;

    // ── 2. Aplica proxy de URLs ──────────────────────────────────────────
    if (typeof patchUrlMappings === "function") {
      patchUrlMappings(URL_MAPPINGS);
    }

    // ── 3. Inicializa o SDK ──────────────────────────────────────────────
    const sdk = new SDK(CLIENT_ID);
    setStatus("Inicializando SDK...");
    await sdk.ready();
    setStatus("Autenticando...");

    // ── 4. Autoriza e obtém code ─────────────────────────────────────────
    const { code } = await sdk.commands.authorize({
      client_id: CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify", "guilds"],
    });

    // ── 5. Troca code por access_token via backend Vercel ────────────────
    setStatus("Conectando...");
    const tokenRes = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const { access_token, error } = await tokenRes.json();

    if (error) {
      throw new Error(typeof error === "string" ? error : JSON.stringify(error));
    }

    // ── 6. Autentica no SDK ──────────────────────────────────────────────
    await sdk.commands.authenticate({ access_token });

    setStatus("Conectado! Carregando sala...");

    // ── 7. Atualiza Rich Presence ────────────────────────────────────────
    try {
      await sdk.commands.setActivity({
        activity: {
          type: 0,
          details: "Sala de Tela",
          state: "Compartilhando tela",
        },
      });
    } catch (e) {
      console.warn("setActivity:", e.message);
    }

    // ── 8. Carrega o site de streaming ───────────────────────────────────
    loadFrame("/.proxy/storb/");

  } catch (err) {
    console.error("Erro:", err);
    showError(err.message || "Erro desconhecido.");
  }
})();

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFrame(src) {
  const frame  = document.getElementById("streamingFrame");
  const loader = document.getElementById("loading");

  if (!frame) return;

  frame.src = src;

  frame.addEventListener("load", function onLoad() {
    if (loader) loader.hidden = true;
    frame.hidden = false;
    frame.removeEventListener("load", onLoad);
  });

  frame.addEventListener("error", function onErr() {
    console.warn("Proxy falhou, tentando URL direta...");
    if (frame.src !== STREAMING_URL) {
      frame.src = STREAMING_URL;
    } else {
      showError("Nao foi possivel carregar a Sala de Tela.");
    }
    frame.removeEventListener("error", onErr);
  });
}

function setStatus(msg) {
  const el = document.getElementById("loadingText");
  if (el) el.textContent = msg;
}

function showError(msg) {
  const loader    = document.getElementById("loading");
  const errScreen = document.getElementById("errorScreen");
  const errText   = document.getElementById("errorText");
  if (loader)    loader.hidden = true;
  if (errText)   errText.textContent = msg;
  if (errScreen) errScreen.hidden = false;
}

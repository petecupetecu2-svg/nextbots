/**
 * api/token.js
 * Vercel Serverless Function — troca o code Discord por um access_token
 *
 * Configurar no Vercel Dashboard > Settings > Environment Variables:
 *   DISCORD_CLIENT_ID     = seu Client ID
 *   DISCORD_CLIENT_SECRET = seu Client Secret
 */

export default async function handler(req, res) {
  // Permite requisição do iframe do Discord
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  const clientId     = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "O servidor esta sem as credenciais do Discord.",
      hint: "Configure DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET nas variaveis de ambiente do Vercel."
    });
  }

  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    "authorization_code",
        code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ access_token: data.access_token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

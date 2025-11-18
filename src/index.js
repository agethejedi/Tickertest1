// Cloudflare Worker for streaming ticker test
const COINS = [
  { id: "ethereum", symbol: "ETH" },
  { id: "iotex", symbol: "IOTX" },
  { id: "solana", symbol: "SOL" },
  { id: "ripple", symbol: "XRP" }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ticker") {
      return handleTicker(env);
    }
    return new Response("Not found", { status: 404 });
  }
};

async function handleTicker(env) {
  try {
    const ids = COINS.map(c => c.id).join(",");
    const apiUrl =
      "https://api.coingecko.com/api/v3/coins/markets" +
      `?vs_currency=usd&ids=${encodeURIComponent(ids)}` +
      "&price_change_percentage=24h";

    const headers = {};
    if (env.COINGECKO_API_KEY) {
      headers["x-cg-pro-api-key"] = env.COINGECKO_API_KEY;
    }

    const res = await fetch(apiUrl, { headers });
    if (!res.ok) {
      return json({ error: "Failed to fetch CoinGecko", status: res.status }, 502);
    }

    const rows = await res.json();
    const assets = rows.map(row => ({
      id: row.id,
      symbol: (row.symbol || "").toUpperCase(),
      name: row.name,
      priceUsd: row.current_price,
      change24hPct: row.price_change_percentage_24h,
      lastUpdated: row.last_updated
    }));

    return json(
      {
        ok: true,
        assets,
        hasAlchemyKey: !!env.ALCHEMY_API_KEY,
        timestamp: Date.now()
      },
      200
    );
  } catch (err) {
    return json({ error: "Server error", detail: err.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

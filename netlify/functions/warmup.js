export async function handler() {
  const backend = process.env.BACKEND_ORIGIN || process.env.VITE_API_BASE_URL;
  if (!backend) {
    return {
      statusCode: 204,
      body: "No backend configured; skipping warmup",
    };
  }

  const url = `${backend.replace(/\/$/, "")}/healthz`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "scholarvault-warmup" },
      redirect: "follow",
    });

    return {
      statusCode: 200,
      body: `Warmup ping ${url} -> ${res.status}`,
    };
  } catch (err) {
    return {
      statusCode: 200,
      body: `Warmup skipped: ${err.message}`,
    };
  }
}

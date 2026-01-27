export default async function handler(req, res) {
  let target = req.query.url;
  if (!target) return res.status(400).send("Missing url");

  if (!target.startsWith("http")) {
    target = "https://" + target;
  }

  try {
    const r = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const contentType = r.headers.get("content-type") || "";

    // 🔹 If NOT HTML → return as binary (prevents crashes)
    if (!contentType.includes("text/html")) {
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      return res.status(r.status).send(buf);
    }

    // 🔹 HTML rewriting only
    let text = await r.text();
    const base = new URL(target);

    text = text.replace(
      /(href|src)=["'](https?:\/\/[^"']*)["']/gi,
      (_, attr, url) =>
        `${attr}="/api/proxy?url=${encodeURIComponent(url)}"`
    );

    text = text.replace(
      /(href|src)=["'](\/[^"']*)["']/gi,
      (_, attr, path) =>
        `${attr}="/api/proxy?url=${encodeURIComponent(base.origin + path)}"`
    );

    res.setHeader("Content-Type", "text/html");
    res.status(r.status).send(text);

  } catch (e) {
    res.status(500).send("Proxy error");
  }
}

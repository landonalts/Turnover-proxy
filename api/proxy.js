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

    let text = await r.text();
    const base = new URL(target);

    // rewrite href/src to stay proxied
    text = text.replace(
      /(href|src)=["'](\/[^"']*)["']/gi,
      (_, attr, path) =>
        `${attr}="/api/proxy?url=${encodeURIComponent(base.origin + path)}"`
    );

    text = text.replace(
      /(href

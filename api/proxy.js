export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("No URL provided");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0"
      }
    });

    const contentType = response.headers.get("content-type");
    res.setHeader("Content-Type", contentType);

    const data = await response.arrayBuffer();
    res.send(Buffer.from(data));
  } catch (e) {
    res.status(500).send("Proxy error");
  }
}

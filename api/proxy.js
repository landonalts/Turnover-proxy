export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    return res.status(400).send("Missing url parameter");
  }

  let url;
  try {
    url = new URL(target);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";

    /* ---------- HANDLE NON-HTML (images, css, js) ---------- */
    if (!contentType.includes("text/html")) {
      res.setHeader("Content-Type", contentType);
      res.status(response.status);
      return res.send(Buffer.from(await response.arrayBuffer()));
    }

    const body = await response.text();

    /* ---------- CLOUDFLARE / CAPTCHA DETECTION ---------- */
    const isCloudflare =
      body.includes("cf-browser-verification") ||
      body.includes("cf-challenge") ||
      body.includes("Just a moment") ||
      body.includes("Checking your browser") ||
      response.headers.get("server")?.toLowerCase().includes("cloudflare");

    if (isCloudflare) {
      return res.status(403).send(`
<!DOCTYPE html>
<html>
<head>
<title>Verification Required</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #020617;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.box {
  background: #020617;
  border: 1px solid #1e293b;
  padding: 24px;
  border-radius: 14px;
  max-width: 420px;
  text-align: center;
}
button {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  cursor: pointer;
}
</style>
</head>
<body>
  <div class="box">
    <h2>Cloudflare Protection</h2>
    <p>
      This website requires browser verification.<br>
      Proxies cannot complete this automatically.
    </p>
    <button onclick="window.open('${url.toString()}', '_blank')">
      Open Site Directly
    </button>
  </div>
</body>
</html>
      `);
    }

    /* ---------- BASIC URL REWRITE (keeps layout usable) ---------- */
    let rewritten = body
      .replace(/href="\/(.*?)"/g, `href="/api/proxy?url=${url.origin}/$1"`)
      .replace(/src="\/(.*?)"/g, `src="/api/proxy?url=${url.origin}/$1"`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(rewritten);

  } catch (err) {
    console.error(err);
    res.status(500).send(`
<!DOCTYPE html>
<html>
<body style="font-family:system-ui;background:#020617;color:white;
display:flex;align-items:center;justify-content:center;height:100vh">
<div>
<h2>Proxy Error</h2>
<p>The site could not be loaded.</p>
</div>
</body>
</html>
    `);
  }
}

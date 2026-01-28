export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url");

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

    // Serve non-HTML normally (images, css, js)
    if (!contentType.includes("text/html")) {
      res.setHeader("Content-Type", contentType);
      return res.send(Buffer.from(await response.arrayBuffer()));
    }

    let body = await response.text();

    // Cloudflare detection
    const isCloudflare =
      body.includes("cf-browser-verification") ||
      body.includes("cf-challenge") ||
      body.includes("Just a moment") ||
      response.headers.get("server")?.toLowerCase().includes("cloudflare");

    if (isCloudflare) {
      return res.status(403).send(`
<!DOCTYPE html>
<html>
<body style="font-family:system-ui;background:#020617;color:white;
display:flex;align-items:center;justify-content:center;height:100vh">
<div>
<h2>Cloudflare Protection</h2>
<p>Open this site directly to verify.</p>
<button onclick="window.open('${url}', '_blank')"
style="padding:10px 14px;border-radius:10px;border:none;
background:#3b82f6;color:white">Open Site</button>
</div>
</body>
</html>
      `);
    }

    // Inject proxy bar
    const proxyBar = `
<style>
#__proxybar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 42px;
  background: #020617;
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-family: system-ui, sans-serif;
  z-index: 999999;
}
#__proxybar button {
  background: #3b82f6;
  border: none;
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
}
body { margin-top: 42px !important; }
</style>

<div id="__proxybar">
  <div>Proxy IP: <span id="proxy-ip">Loading…</span></div>
  <button onclick="alert('Settings coming from main portal')">
    Settings
  </button>
</div>

<script>
fetch('https://ipapi.co/ip/')
  .then(r => r.text())
  .then(ip => {
    document.getElementById('proxy-ip').textContent = ip;
  })
  .catch(() => {
    document.getElementById('proxy-ip').textContent = 'Unavailable';
  });
</script>
`;

    // Insert bar after <body>
    body = body.replace(
      /<body[^>]*>/i,
      match => match + proxyBar
    );

    // Basic URL rewriting
    body = body
      .replace(/href="\/(.*?)"/g, `href="/api/proxy?url=${url.origin}/$1"`)
      .replace(/src="\/(.*?)"/g, `src="/api/proxy?url=${url.origin}/$1"`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(body);

  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
}

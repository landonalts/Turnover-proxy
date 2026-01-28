export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");

  let url;
  try {
    url = new URL(target);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  try {
    // Detect if the site is Google search, Brave Search, or other heavy search engine
    const isGoogleSearch = url.hostname.includes("google.com");
    const isBraveSearch = url.hostname.includes("search.brave.com");
    const isHeavySearch = isGoogleSearch || isBraveSearch;

    // If heavy search engine, force open in new tab
    if (isHeavySearch) {
      return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Open in New Tab</title>
<style>
body {
  font-family: system-ui, sans-serif;
  background: #020617;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}
button {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}
</style>
</head>
<body>
<h2>Search Site</h2>
<p>This search site must open in a new tab to work properly.</p>
<button onclick="window.open('/api/proxy?url=${encodeURIComponent(
        url.toString()
      )}', '_blank')">Open Proxied</button>
</body>
</html>
      `);
    }

    // Fetch the target page (normal lightweight site)
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

    // Serve non-HTML resources normally
    if (!contentType.includes("text/html")) {
      res.setHeader("Content-Type", contentType);
      res.status(response.status);
      return res.send(Buffer.from(await response.arrayBuffer()));
    }

    let body = await response.text();

    // Detect Cloudflare / CAPTCHA
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
<head><meta charset="UTF-8"><title>Verification Required</title></head>
<body style="font-family:system-ui;background:#020617;color:white;
display:flex;align-items:center;justify-content:center;height:100vh">
<div style="text-align:center;">
<h2>Cloudflare Protection</h2>
<p>This site requires browser verification.</p>
<button onclick="window.open('${url.toString()}', '_blank')">Open Site Directly</button>
</div>
</body>
</html>
      `);
    }

    // -------- PROXY BAR INJECTION --------
    const proxyBar = `
<style>
#__proxybar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: #020617;
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-family: system-ui, sans-serif;
  z-index: 2147483647;
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
html { margin-top: 44px !important; }
</style>

<div id="__proxybar">
  <div>Proxy IP: <span id="__proxyip">Loading…</span></div>
  <button onclick="alert('Settings available on main portal')">Settings</button>
</div>

<script>
// Client-side fetch for proxy IP (safe)
fetch('https://ipapi.co/ip/')
  .then(r => r.text())
  .then(ip => document.getElementById('__proxyip').textContent = ip)
  .catch(() => document.getElementById('__proxyip').textContent = 'Unavailable');
</script>
`;

    // Inject proxy bar before </html>
    if (body.includes("</html>")) {
      body = body.replace(/<\/html>/i, proxyBar + "</html>");
    } else {
      body += proxyBar;
    }

    // Basic relative URL rewriting
    body = body
      .replace(/href="\/(.*?)"/g, `href="/api/proxy?url=${url.origin}/$1"`)
      .replace(/src="\/(.*?)"/g, `src="/api/proxy?url=${url.origin}/$1"`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(body);
  } catch (err) {
    console.error(err);
    res.status(500).send(`
<!DOCTYPE html>
<html>
<body style="font-family:system-ui;background:#020617;color:white;
display:flex;align-items:center;justify-content:center;height:100vh">
<div>
<h2>Proxy Error</h2>
<p>The page could not be loaded.</p>
</div>
</body>
</html>
    `);
  }
}

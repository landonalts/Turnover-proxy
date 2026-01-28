import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const target = req.query.url;
    if (!target) return res.status(400).send("No URL provided");

    // Make sure URL is valid
    const url = new URL(target);

    // Fetch target page with browser-like headers
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow", // Follow redirects
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      // For images, scripts, etc., just pipe the response
      res.setHeader("Content-Type", contentType);
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }

    let html = await response.text();

    // Rewrite all URLs to go through the proxy
    html = html
      .replace(/href="(http[s]?:\/\/[^"]+)"/g, 'href="/api/proxy?url=$1"')
      .replace(/src="(http[s]?:\/\/[^"]+)"/g, 'src="/api/proxy?url=$1"')
      .replace(/action="(http[s]?:\/\/[^"]+)"/g, 'action="/api/proxy?url=$1"');

    // Inject portal UI (settings button)
    const portalUI = `
      <div id="proxy-settings" style="position:fixed;top:10px;right:10px;z-index:9999;">
        <button onclick="alert('Settings coming from main portal')">Settings</button>
      </div>
    `;
    html = html.replace("</body>", `${portalUI}</body>`);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
}

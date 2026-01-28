import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const target = req.query.url;
    if (!target) return res.status(400).send("No URL provided");

    // Fetch the target page
    const response = await fetch(target, {
      headers: {
        "User-Agent": req.headers["user-agent"], // mimic client
        "Accept": "text/html",
      },
    });

    let html = await response.text();

    // Rewrite all links, forms, scripts, and images to go through proxy
    html = html
      .replace(/href="(http[s]?:\/\/[^"]+)"/g, 'href="/api/proxy?url=$1"')
      .replace(/src="(http[s]?:\/\/[^"]+)"/g, 'src="/api/proxy?url=$1"')
      .replace(/action="(http[s]?:\/\/[^"]+)"/g, 'action="/api/proxy?url=$1"');

    // Inject settings button and portal UI
    const portalUI = `
      <div id="proxy-settings" style="position:fixed;top:10px;right:10px;z-index:9999;">
        <button onclick="alert('Settings coming from main portal')">Settings</button>
      </div>
    `;

    html = html.replace("</body>", `${portalUI}</body>`);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
}

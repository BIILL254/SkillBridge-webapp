import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..");

const openapiJsonPath = path.join(root, "docs", "openapi.json");
const swaggerHtmlPath = path.join(root, "docs", "swagger.html");

if (fs.existsSync(openapiJsonPath)) {
  const spec = JSON.parse(fs.readFileSync(openapiJsonPath, "utf8"));
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SkillBridge API - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(spec)};
      const origin = (window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:"))
        ? window.location.origin
        : "http://localhost:3001";
      spec.servers = [
        { url: origin + "/api", description: "Current active server (" + origin + ")" },
        { url: origin, description: "Root base URL without /api" },
        { url: "http://localhost:3001/api", description: "Localhost fallback" }
      ];
      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  fs.writeFileSync(swaggerHtmlPath, html, "utf8");
  console.log("Successfully generated docs/swagger.html");
} else {
  console.error("docs/openapi.json not found! Run redocly bundle first.");
}

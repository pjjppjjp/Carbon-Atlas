# Carbon Atlas — GitHub Pages replacement

**Build 1.1.0 · September 6, 2026**

This is the complete replacement website, not a patch and not a ZIP to open in the browser. No build, npm installation, API key or paid hosting is needed. The original dark map UI, seven ecosystems, search, educational content and future lab are retained.

## Update your existing GitHub Pages website

1. Extract the downloaded ZIP and open `Carbon_Atlas_GitHub_Replacement`.
2. Open your existing GitHub repository at the folder that currently publishes the working `index.html`. Keep the same Pages branch and publishing folder. For a root deployment, this is the repository root; for a `/docs` deployment, this is that existing `docs` folder.
3. Choose **Add file → Upload files**. Drag the **contents** of this replacement folder into that publishing folder, including `index.html`, `diagnostics.html`, `assets`, `css`, `data` and `js`. Commit the replacement. Upload the files, not the ZIP and not an extra enclosing folder.
4. Wait for the Pages deployment to complete. Reopen your existing HTTPS website address and hard-refresh the page. In Safari, use View → Reload Page (Command–R). To bypass an old entry page, append `?v=1.1.0` to the website address before any `#` fragment. On a phone, reload or close and reopen the tab.

Keep an existing `CNAME` file and your existing `.github` deployment configuration. They are not included or changed here. Do not change a previously working custom domain or Pages source. The new app does not need `Open Carbon Atlas.html`; `index.html` is the entry point.

Expected layout **inside your existing publishing folder**:

```text
index.html
diagnostics.html
assets/
css/
data/
js/
docs/                  # references and verification notes
README.md
UPLOAD-INSTRUCTIONS.txt
LICENSE
.nojekyll
_headers               # optional headers for hosts that support this file
```

This package uses relative asset paths, so it also works under a GitHub project URL with a repository-name prefix. All individual files are below 25 MiB and the file count is below 100. Hidden `.nojekyll` can be included when your file picker exposes it; none of the application's required folders begins with an underscore.

GitHub instructions: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
Pages source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## What changed

### A colored experience inside the existing interface

The 3D specimen and **Camera view** live in the Carbon Atlas dialog. Camera view has move, turn and size controls, plus Camera off. Camera tracks stop when the view is closed, hidden or switched back to the specimen. There is no image upload or recording in the app.

All seven original habitat models have explicit embedded color textures in both GLB and USDZ, rather than relying on native viewers to interpret vertex colors. The internal WebGL view also uses the updated palette. Backgrounds, lighting and specimen framing match the site's existing dark visual design.

### Camera view versus floor AR

- **Camera view** is in-page camera compositing with manual positioning. It does not identify or track the floor. Move and turn the model using the controls; it stays within the website interface.
- **Place on floor** uses device-supported WebXR hit testing with Carbon Atlas's controls in a required DOM overlay. Move the phone until a floor target appears, then place the ecosystem. A rejected or unsupported session returns to the in-page view.
- **Apple floor AR / Android floor AR** are optional OS-native viewing routes on supported devices. Those separate viewers use the newly textured USDZ/GLB assets. They are not the default in-page camera action. Their operating-system interface is separate from the website.

Use the HTTPS GitHub Pages address for camera and AR. Permit camera access when requested. A desktop without a camera still has the interactive colored 3D specimen. Physical-phone floor tracking and native material rendering require verification on the actual phone; see `docs/TESTING.md` for what was tested here.

### Source-backed scientific filters

The forest filter now uses Terrascope's newer WMS endpoint and current published layer identifier. Habitat layers have supported alternative transports/publications where available, center-prioritized requests, cancellation, bounded fetch timeouts, refresh and per-dataset status.

Each layer identifies its main system, reference edition, method, legend and resolution/time context. Observed habitat compilations, remotely sensed classifications, modelled kelp and chlorophyll concentration are kept distinct. Alternate publications are named rather than silently treated as the same edition. Tree-cover visualization is not an intact-rainforest map. Chlorophyll in mg/m³ is a satellite pigment proxy, not organism counts.

Live photographs, satellite imagery and habitat services still need internet access. Source service availability, coverage, CORS settings and observation dates can affect delivery. Unavailable or incomplete data is reported, not replaced with invented ecosystem regions.

## Checking a filter on your deployed site

Open **Data layers → Run device & service checks**, or `diagnostics.html` alongside your site's `index.html`. Select **Test seven datasets** and download the report. This runs the actual application adapters against the providers from your browser and distinguishes a returned tile, partial response, failed service and cancelled test. An empty or received tile does not establish habitat absence or complete coverage.

The map's **Refresh data** button re-requests active layers; individual failed datasets also expose a retry control. An external outage cannot be fixed by re-uploading the website.

## Verification and source files

`docs/TESTING.md`, `docs/browser-test-results.json`, `docs/asset-validation.json` and `docs/unit-test-results.txt` document the actual checks and their limits. `docs/SOURCES.md` credits the existing linked photographs and data providers; `docs/UPDATE-NOTES.md` records the revised transports.

Core files are readable JavaScript, CSS and JSON. No CDN is needed for the UI, model renderer or model assets. `_headers` is retained for hosts that support it; GitHub Pages does not process that file. No analytics, credentials, API secrets or personal data are included.

Safari reload instructions: https://support.apple.com/en-us/102564

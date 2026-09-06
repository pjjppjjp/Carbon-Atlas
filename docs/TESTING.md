# Verification — build 1.1.0

Verified September 6, 2026. These are implementation tests, not a claim that every public provider or phone is always available.

## Completed checks

| Check group | Result |
|---|---:|
| Main Chromium browser regression | 53 passed |
| Additional AR-fallback, camera-cancellation, NASA-link and diagnostics checks | 8 passed |
| JavaScript unit checks | 28 passed |
| GLB / USDZ / internal color-asset validation | 7 models passed |

See the JSON/text reports in this folder for individual check names. Models were rendered with real WebGL, and pixel tests verified visibly colored surfaces for each of the seven ecosystems. Actual desktop and mobile viewport layouts were inspected. The original map, search, future lab and GIS/GPS/remote-sensing sections remain functional in the regression.

## Test environment and scope

Chromium 144 with software WebGL under Xvfb was used. Desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844. Browser network navigation was policy-blocked in the build environment, so the same application modules and asset bytes were loaded in a test-only bundled document. That injected test bundle is **not** shipped in the website.

Camera tests used a synthetic canvas MediaStream. They verified the in-page view, positioning controls, track shutdown, permission-error recovery, close/stop behavior and a permission completion arriving after cancellation. A rejected WebXR request was simulated to verify recovery into the branded dialog. These are not physical camera, iPhone, ARCore or floor-tracking tests.

Data adapter tests used small, explicitly synthetic protocol responses to exercise vector decoding, image masking, date/CRS request construction, all seven toggles, concurrent queues, fallback transport, source attribution, cancellation, partial/error reporting and retries. No synthetic geometry, data fixture, camera image or invented habitat area is included in the deployed app. External source metadata was checked separately. Live remote delivery was not verified end-to-end in the browser; the kelp service timed out during a live metadata request. `diagnostics.html` runs those service checks on the actual deployed website.

GLB validation checked headers, buffer bounds, triangle indices, texture presence, UV samples and exact color agreement with the internal model. USDZ validation checked ZIP integrity, embedded texture agreement, shader/material references and 64-byte entry alignment. It did not use Apple's native renderer or an installed USD schema validator. Verify final native material appearance and scale on the intended physical phone.

The package's local URLs are additionally checked over an actual HTTP server and recorded in `release-validation.json`. This checks file delivery, not remote provider availability or GitHub deployment status.

## Suggested deployed-phone check

Open the HTTPS GitHub Pages address. Open one ecosystem, switch to Camera view, grant camera permission and test move, turn, size and Camera off. Then try the optional device-supported floor-AR route and verify color and surface placement. Run the seven-dataset check page from the Data layers panel to establish delivery from that network. A received tile is not proof of exhaustive habitat coverage.

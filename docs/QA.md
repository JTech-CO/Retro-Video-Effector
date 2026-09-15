# Validation / 2.1.0

[한국어](QA-KR.md) · [Home](../README.md)

## Results

| Check | Result | Raw evidence |
|---|---|---|
| Numerical kernel, parameter and preset regression | 47 passed, 0 failed | [Node TAP](qa-core.tap) |
| Browser UI, localization, layouts, I/O and selected mock API checks | 144 passed, 0 failed | [Browser JSON](qa-browser.json) |
| Static resources, CSP, links, folders, UTF-8 and removal of dummy shell UI | 27 passed, 0 failed | [Static log](qa-static.txt) |
| Comparison with 2.0.0 | Engine bytes, 30 contracts and four presets unchanged | [Release record](release.json) |

Browser: Chromium 144.0.7559.96. These checks ran again against the 2.1.0 files. The browser count includes individual parameter inputs, 30 individual help buttons, state/layout checks and mocked storage/share branches, not 144 devices or browsers.

## Actual functionality exercised

Native file chooser opening; PNG decoding from local File objects; real Blob Worker processing and main-thread fallback; all parameter listeners and contextual help; presets, seed and resolution; current-version rendering; original/split/zoom/pan views; real PNG/JPEG/JSON downloads. Downloaded images were reopened with Pillow to verify format and dimensions. Processed PNG bytes stayed identical when preview-only comparison and original-view controls were changed.

EN/KR changes preserved parameter values, pixels, active tab, zoom and Unicode filenames. Both message dictionaries, parameter labels/help, declarative text/ARIA/tooltip/meta keys, export formats and status messages were checked. A Korean button rendered actual glyphs using the installed Noto Sans CJK KR font, not a downloaded font. Tested UI type was at least 14px and contained no Unicode replacement characters. This is not a guarantee that every device has a Korean font installed.

Viewport tests: 1920×1080, 1440×900, 1024×768, 920×800, 768×1024, 390×844 and 320×640. Checks covered horizontal overflow, type sizes, absence of sliding/fixed property overlays, and access to the bottom tape controls on small displays. See the [action map](ACTIONS.md).

## Navigation versus in-memory loading

Both actual file:// and browser localhost navigation were blocked with ERR_BLOCKED_BY_ADMINISTRATOR. Browser policies were not changed or bypassed. After reporting the failure, the harness loaded the actual source in memory using the allowed page-content API. Only this test copy permitted inline scripts; the distributed entry retains its strict CSP and external scripts.

Canvas, Worker, font rendering and download behavior actually ran, but the final external-script CSP on an HTTP origin and direct index.html navigation were not validated. Separately, a Python HTTP server/client requested every runtime resource under a repository subpath and verified HTTP 200, MIME type and exact bytes. This is not an actual GitHub Pages deployment test.

## Simulated inputs and unverified areas

Language read/write logic used injected storage. Denied-storage behavior was also checked. Native localStorage persistence after navigation/reload is unverified in this environment.

The unavailable native-share button was hidden based on real Chromium capability. The supported branch passed a genuine PNG File to a mocked OS receiver. Actual share-sheet opening and delivery to a target app are unverified. OS policy, permissions or expired user activation may reject sharing; the app reports failure.

Paste/drop events were synthetic; the following image decoding and processing were real. Safari, Firefox, physical mobile devices, all image format/decoder combinations, device memory limits, every browser-zoom/font combination and all assistive-technology paths were not tested.

## Re-run

The app itself is build-free. Optional developer commands:

```text
node --test tests/engine.test.cjs
python tests/static.test.py
python tests/browser.test.py
```

The browser harness first attempts real navigation and records any blocked-origin fallback. Generated test files go into `.test-output/`, which is excluded from the release ZIP.

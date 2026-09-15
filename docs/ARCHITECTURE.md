# Architecture / 2.1.0

[한국어](ARCHITECTURE-KR.md) · [Home](../README.md)

## Static entry

The entry loads two stylesheets and six ordered classic deferred scripts: parameters, strings, engine, processor, demo, and app. No module server, dynamic imports, bundles, or CDN requests are needed. `windows95.css` preserves the supplied template; `app.css` overrides its background, typography, and outer layout. The desktop `shell.js` is removed.

The distributed CSP permits same-origin scripts, local coordinate styles, Blob/data images, and Blob Workers. It denies outbound connections and form submissions, and does not permit inline JavaScript or unsafe-eval. Worker code is built from the already-loaded self-contained kernel, not another network request.

## App-only interface and localization

The root fills the browser width. Desktop has independent preview and property columns; widths of 920px or less stack the panes in ordinary document flow. Only the image container gets pan/zoom transforms, not the UI text.

`strings.js` has ko and en dictionaries. Visible selectors read KR and EN. `applyLanguage()` updates declarative text, accessible names, metadata and parameter labels without requesting new image processing. It preserves source filename, active tab, parameters and zoom. Language persistence is best-effort; denied storage does not break selection. The default is Korean and valid stored choices are restored. An obsolete ja preference falls back to Korean.

## Processing and export

Decode and size-limit the input, composite transparency onto black, optionally perform a real browser JPEG encode/decode, then execute the previous numerical kernel. Its tone/channel adjustment, YIQ decomposition, ringing, bandwidth limiting, chroma spread, jitter/noise, RGB reconstruction and dropout processing are unchanged. The bytes of `engine.js` were preserved for this release.

Versioned requests commit only the result for the latest image and parameters. Export waits for the newest result and encodes a separate Canvas copy. Preview chrome, comparison divider and zoom state are not exported. Blob Worker failures fall back to the same kernel on the main thread while preserving the source buffer.

Settings continue to write `retro-video-effector/settings` version 2 and read `vhs-local-clone/settings` version 1. Parameter bounds and unknown-key normalization remain intact.

## Availability and checks

`syncImageCommands()` gates actions by image, loading, and export state. Native sharing is exposed only when navigator.share and file-aware navigator.canShare indicate support. Platform rejection produces an explanation instead of pretending to share. Normal export downloads a Blob rather than uploading images.

The [QA report](QA.md) separates actual browser functionality from origin navigation. Where policy blocks navigation, the harness uses an in-memory copy with test-only inline-script permission. The release CSP is unchanged. That fallback is not proof of GitHub Pages deployment or native storage persistence across navigation.

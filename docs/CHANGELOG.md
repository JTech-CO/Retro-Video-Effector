# Change log

[한국어](CHANGELOG-KR.md) · [Home](../README.md)

## 2.1.0 / Application-only layout

Removed the simulated desktop heading and shortcuts, Start button, taskbar, clock, application minimize/maximize/close controls, and decorative resize grip. Removed `js/shell.js` and replaced `css/desktop.css` with `css/app.css`. The editor now starts at the page origin and uses the full width. Navy and silver beveled styling remains inside the editor.

Removed duplicate dropdown menus and the Properties button that merely focused an already-visible pane. Real image operations and diagnostic pattern generation remain. Native file sharing appears only when supported; missing-image actions are disabled. Save and Help close controls remain because they operate real dialogs.

Replaced the three-language cycle with explicit EN / KR buttons. Translated interface text, parameter help, accessible names, export formats, metadata, processing status, and recognized status notifications. Fixed the uploaded filename being overwritten by “No image” during language switching. Parameters, pixels, active tab, and zoom are preserved.

Applied UTF-8 and Korean-capable system fonts without distributing fonts or requesting them over the network. Body type is 16px, ordinary controls 15px, and supporting text at least 14px. Mobile no longer shrinks labels to 10-13px. Monospaced faces are restricted to numerical readouts and the Latin wordmark.

The contents of `engine.js` are unchanged. All 30 parameter contracts and four preset pixel baselines remain intact. Settings keep version-2 output and version-1 read compatibility. The exported `engine: rve-js-2.0.0` identifies the unchanged numerical kernel, not the 2.1.0 UI package.

Updated action maps, bilingual documentation, screenshots, and regression tests. Historical reports are not presented as new validation results.

## 2.0.0 / Previous release

Renamed the project to Retro Video Effector, introduced the supplied Windows 95 foundation, fixed property tabs, vintage source presentation, and build-free folder structure. Its desktop shell is superseded by 2.1.0.

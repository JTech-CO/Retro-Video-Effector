# Button and input action map

[한국어](ACTIONS-KR.md) · [Home](../README.md)

| Control | Identifier | Real action |
|---|---|---|
| EN / KR | `lang-en`, `lang-kr` | Direct language selection and best-effort localStorage write |
| Open image / initial Open | `btn-upload-trigger`, `btn-drop-upload` | Native local file picker |
| Save image | `btn-export` | Open the PNG/JPEG export dialog |
| Compare | `btn-compare` | Toggle source/processed split view |
| Reset effects | `btn-reset` | Reset 30 parameters and noise seed, keeping the image |
| Test pattern | `btn-demo` | Create a real procedural diagnostic image |
| Help | `btn-info` | Open actual program help |
| Share PNG | `btn-share` | Only visible in file-share-capable browsers; create a PNG File and explicitly invoke OS sharing |
| View original / processed | `btn-original` | Toggle preview source, not export source |
| Fit / zoom in / zoom out | `btn-fit`, `btn-zoom-in`, `btn-zoom-out` | Modify actual preview transform |
| Direction buttons | `data-dir` | Pan preview on smaller displays |
| Effect tabs | `property-tab-0` to `3` | Select a real parameter page |
| Parameter ? | `data-help` | Display the parameter-specific localized explanation |
| New noise | `btn-reseed` | Change seed and recompute pixels |
| Load/save settings | `btn-settings-load`, `btn-settings-save` | Local JSON picker / actual JSON download |
| Save file | `btn-download` | Wait for the latest processing and download PNG/JPEG bytes |
| Cancel / Close / OK | `data-close` | Close the specified real dialog |
| Preset / resolution / seed | `preset-select`, `resolution-select`, `seed-input` | Apply values and process pixels |
| 30 effect inputs | `p_*` | Modify the corresponding effect record and render |
| Split / zoom / quality | `compare-slider`, `zoom-slider`, `export-quality` | Adjust split position / zoom / JPEG output quality |

Image-dependent commands are disabled before an image is loaded and during decoding. Parent effect switches disable their dependent sliders. These are stateful commands, not unimplemented controls.

There are no outgoing website hyperlinks in the UI. Download anchors are created on demand with valid Blob URLs and removed. Relative documentation links are checked statically. Native OS share destination delivery is outside this browser test environment and was not verified.

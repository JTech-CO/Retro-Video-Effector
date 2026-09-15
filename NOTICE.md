# Attribution and scope

The current product is **Retro Video Effector**. Its application branding, app-only layout and output naming are independent of the original reference service.

## Earlier implementation and reference

This release modifies Retro Video Effector 2.0.0, which was derived from the locally generated HEISEI-VHS Local Clone 1.0.0 package. That package independently reimplemented the control contract at https://hiyameshi-retro-pack.web.app/apps/Heisei-VHS/ by Hiyameshi. The earlier and current packages are not affiliated with or endorsed by that service. The original service's WASM binary, JavaScript engine, font binaries, product images and icons are not bundled. No claim of output parity with that service is made.

The preceding package's MIT copyright notice is retained in LICENSE. Newly modified implementation files are attributed to Retro Video Effector contributors. The old configuration schema string is retained only to read previously exported settings; new exports use the current product schema.

## User-supplied CSS

`css/windows95.css` is the supplied `Windows 95 style.css`, retained without content changes. Its navy titlebar and raised silver controls supply the visual foundation. The new app stylesheet overrides the template's outer black background, centered window margins, and old font choices. No desktop is rendered. No separate upstream license statement was supplied with that template. Its rights are not re-assigned by this package's MIT notice. `css/app.css` supplies the new application layout and overrides. Any rights in the template remain with its rights holder.

## Other assets

The small inline icons and favicon are newly drawn SVG geometry. They are not Microsoft icon files. The demo is generated procedurally in JavaScript. Screenshots show the actual browser rendering of this implementation. System fonts are referenced by name; **no font binaries** are bundled.

The Windows 95 designation describes the requested visual style only. This package is not a Microsoft product and does not implement or redistribute Windows. Uploaded image rights remain with their owners.

## Runtime privacy

The image-processing path has no machine-learning model, model weights, inference endpoint, telemetry or image upload. The app does not persist image bytes. A user-invoked share action can pass an exported file to the operating system. Only the language preference uses localStorage. “No AI” concerns runtime processing, not the development process.

한국어: 이전 구현과 외부 참고 서비스의 명칭은 출처 및 라이선스 기록에만 남겨 두었습니다. 새 UI와 출력 파일은 Retro Video Effector 명칭을 사용합니다. 첨부 CSS의 권리는 그 권리자에게 있으며, 새 구현의 MIT 표기를 해당 템플릿이나 외부 서비스의 코드에 대한 재라이선스로 해석하지 않습니다. Windows 95는 화면 스타일을 설명하는 표현입니다. 외부 서비스의 엔진, 운영체제 아이콘, 폰트 파일은 포함하지 않았습니다.

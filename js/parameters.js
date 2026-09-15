/* ========================================================================
 * RETRO VIDEO EFFECTOR                          APPLICATION EDITION / REV. 2.1
 * FILE    : PARAMETERS.JS
 * MODULE  : PARAMETER ROM
 * PURPOSE : 30 CONTROLS / RANGE CHECKS / FACTORY PRESET RECORDS
 * REM     : VINTAGE SOURCE STYLE. MODERN BROWSER SERVICES REMAIN IN USE.
 * ======================================================================== */
(function (root)
{
    'use strict';
    var definitions = [
        {
            "key": "apply_jpeg",
            "type": "checkbox",
            "group": 0,
            "label": {
                "ko": "JPEG 블록 노이즈",
                "en": "JPEG block noise"
            },
            "help": {
                "ko": "브라우저의 실제 JPEG 인코더로 압축한 뒤 다시 읽습니다. VHS 테이프가 아닌 디지털 재압축 단계입니다.",
                "en": "Re-encode and decode using the browser JPEG codec. Digital recompression is distinct from tape degradation."
            },
            "default": true
        },
        {
            "key": "jpeg_quality",
            "type": "range",
            "group": 0,
            "label": {
                "ko": "JPEG 압축 품질",
                "en": "JPEG quality"
            },
            "help": {
                "ko": "낮을수록 손실 압축이 강해집니다. JPEG 블록 노이즈가 켜졌을 때 적용됩니다.",
                "en": "Lower values increase lossy compression. Requires JPEG block noise."
            },
            "min": 1.0,
            "max": 100.0,
            "step": 1.0,
            "default": 65.0,
            "parent": "apply_jpeg"
        },
        {
            "key": "tone_low",
            "type": "range",
            "group": 0,
            "label": {
                "ko": "블랙 포인트",
                "en": "Black point"
            },
            "help": {
                "ko": "이 값 이하의 RGB 톤을 검정으로, 그 위를 다시 배분합니다.",
                "en": "RGB values below this point become black; the remaining range is remapped."
            },
            "min": 0.0,
            "max": 50.0,
            "step": 1.0,
            "default": 16.0
        },
        {
            "key": "tone_high",
            "type": "range",
            "group": 0,
            "label": {
                "ko": "화이트 포인트",
                "en": "White point"
            },
            "help": {
                "ko": "이 값 이상의 RGB 톤을 흰색으로 만듭니다. 낮추면 밝은 영역의 디테일이 줄어듭니다.",
                "en": "RGB values above this point become white, reducing highlight detail."
            },
            "min": 200.0,
            "max": 255.0,
            "step": 1.0,
            "default": 230.0
        },
        {
            "key": "apply_strong_ringing",
            "type": "checkbox",
            "group": 1,
            "label": {
                "ko": "강한 링잉",
                "en": "Strong ringing"
            },
            "help": {
                "ko": "휘도에 수평 언샤프 마스크를 적용해 경계 양옆의 밝고 어두운 테두리를 만듭니다.",
                "en": "Apply horizontal luma unsharp masking to create bright and dark edge fringes."
            },
            "default": true
        },
        {
            "key": "sharpen_amount",
            "type": "range",
            "group": 1,
            "label": {
                "ko": "샤프니스 강도",
                "en": "Sharpening amount"
            },
            "help": {
                "ko": "링잉의 대비를 정합니다. 강한 링잉이 켜졌을 때만 적용됩니다.",
                "en": "Contrast of the ringing fringes. Requires strong ringing."
            },
            "min": 0.0,
            "max": 10.0,
            "step": 0.1,
            "default": 3.0,
            "parent": "apply_strong_ringing"
        },
        {
            "key": "sharpen_size",
            "type": "range",
            "group": 1,
            "label": {
                "ko": "샤프니스 폭",
                "en": "Sharpening width"
            },
            "help": {
                "ko": "링잉 테두리의 폭입니다. 수평 방향으로 적용되며 720px 기준으로 비례 조정됩니다.",
                "en": "Horizontal ringing radius, scaled relative to a 720px-wide image."
            },
            "min": 1.0,
            "max": 5.0,
            "step": 1.0,
            "default": 2.0,
            "parent": "apply_strong_ringing"
        },
        {
            "key": "apply_color_cast",
            "type": "checkbox",
            "group": 1,
            "label": {
                "ko": "컬러 캐스트",
                "en": "Color cast"
            },
            "help": {
                "ko": "RGB 채널의 게인을 따로 바꿔 기기의 색 편향을 흉내 냅니다.",
                "en": "Adjust channel gains to imitate a color-biased device."
            },
            "default": true
        },
        {
            "key": "cast_r",
            "type": "range",
            "group": 1,
            "label": {
                "ko": "빨강 게인 · R",
                "en": "Red gain · R"
            },
            "help": {
                "ko": "빨강 채널을 곱셈 조정합니다. 1.00이면 변화가 없습니다.",
                "en": "Multiply the red channel. 1.00 leaves it unchanged."
            },
            "min": 0.8,
            "max": 1.2,
            "step": 0.01,
            "default": 0.95,
            "parent": "apply_color_cast"
        },
        {
            "key": "cast_g",
            "type": "range",
            "group": 1,
            "label": {
                "ko": "초록 게인 · G",
                "en": "Green gain · G"
            },
            "help": {
                "ko": "초록 채널을 곱셈 조정합니다. 1.00이면 변화가 없습니다.",
                "en": "Multiply the green channel. 1.00 leaves it unchanged."
            },
            "min": 0.8,
            "max": 1.2,
            "step": 0.01,
            "default": 1.05,
            "parent": "apply_color_cast"
        },
        {
            "key": "cast_b",
            "type": "range",
            "group": 1,
            "label": {
                "ko": "파랑 게인 · B",
                "en": "Blue gain · B"
            },
            "help": {
                "ko": "파랑 채널을 곱셈 조정합니다. 1.00이면 변화가 없습니다.",
                "en": "Multiply the blue channel. 1.00 leaves it unchanged."
            },
            "min": 0.8,
            "max": 1.2,
            "step": 0.01,
            "default": 1.0,
            "parent": "apply_color_cast"
        },
        {
            "key": "cutoff_y",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "휘도 대역 · Y",
                "en": "Luma bandwidth · Y"
            },
            "help": {
                "ko": "낮추면 명암 경계의 수평 디테일이 줄어듭니다. 원본 장비의 MHz가 아닌 재구현의 정규화 값입니다.",
                "en": "Lower values soften horizontal luminance detail. Normalized reconstruction units, not physical MHz."
            },
            "min": 0.01,
            "max": 1.0,
            "step": 0.01,
            "default": 0.4
        },
        {
            "key": "cutoff_i",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "색차 대역 · I",
                "en": "Chroma bandwidth · I"
            },
            "help": {
                "ko": "YIQ의 I 신호에 수평 저역통과 필터를 적용합니다. 낮을수록 색이 더 길게 번집니다.",
                "en": "Low-pass filter the YIQ I signal horizontally. Lower values produce longer color trails."
            },
            "min": 0.001,
            "max": 0.1,
            "step": 0.001,
            "default": 0.03
        },
        {
            "key": "cutoff_q",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "색차 대역 · Q",
                "en": "Chroma bandwidth · Q"
            },
            "help": {
                "ko": "YIQ의 Q 신호에 수평 저역통과 필터를 적용합니다. 낮을수록 색이 더 길게 번집니다.",
                "en": "Low-pass filter the YIQ Q signal horizontally. Lower values produce longer color trails."
            },
            "min": 0.001,
            "max": 0.1,
            "step": 0.001,
            "default": 0.03
        },
        {
            "key": "chroma_crosstalk",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "수직 색 번짐",
                "en": "Vertical chroma bleed"
            },
            "help": {
                "ko": "바로 위 행의 색차를 섞어 아래쪽으로 색이 번지게 합니다. 휘도는 섞지 않습니다.",
                "en": "Mix chroma with the previous row. Luminance is not mixed."
            },
            "min": 0.0,
            "max": 0.95,
            "step": 0.01,
            "default": 0.4
        },
        {
            "key": "chroma_shift_x",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "수평 색 어긋남",
                "en": "Horizontal chroma shift"
            },
            "help": {
                "ko": "밝기 정보는 유지하고 색차 신호만 오른쪽으로 이동시킵니다. 720px 기준입니다.",
                "en": "Delay chroma to the right without delaying luma. Units are relative to 720px."
            },
            "min": 0.0,
            "max": 15.0,
            "step": 1.0,
            "default": 3.0
        },
        {
            "key": "noise_intensity_y",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "휘도 노이즈",
                "en": "Luma noise"
            },
            "help": {
                "ko": "휘도 신호에 시드 기반 난수를 더합니다. 동일한 시드와 설정은 같은 픽셀 결과를 만듭니다.",
                "en": "Add seeded noise to luminance. Matching settings and seed give repeatable pixels."
            },
            "min": 0.0,
            "max": 0.1,
            "step": 0.001,
            "default": 0.02
        },
        {
            "key": "noise_intensity_c",
            "type": "range",
            "group": 2,
            "label": {
                "ko": "색차 노이즈",
                "en": "Chroma noise"
            },
            "help": {
                "ko": "I/Q 색차에 서로 다른 난수를 더합니다. 노이즈는 이미지 내용을 학습하지 않습니다.",
                "en": "Add independent seeded noise to I and Q. No image content is learned."
            },
            "min": 0.0,
            "max": 0.1,
            "step": 0.001,
            "default": 0.01
        },
        {
            "key": "jitter_freq",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "지터 주파수",
                "en": "Jitter frequency"
            },
            "help": {
                "ko": "수평 흔들림이 세로 방향으로 반복되는 빈도입니다. 지터 진폭이 0이면 영향이 없습니다.",
                "en": "Frequency of row displacement along the vertical axis. Inactive at zero jitter amplitude."
            },
            "min": 0.01,
            "max": 0.2,
            "step": 0.01,
            "default": 0.05
        },
        {
            "key": "jitter_amp",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "지터 진폭",
                "en": "Jitter amplitude"
            },
            "help": {
                "ko": "각 행을 좌우로 이동시키는 정도입니다. 0이면 지터는 꺼집니다.",
                "en": "Horizontal row displacement. Zero disables jitter."
            },
            "min": 0.0,
            "max": 5.0,
            "step": 0.1,
            "default": 0.5
        },
        {
            "key": "classic_jitter",
            "type": "checkbox",
            "group": 3,
            "label": {
                "ko": "불규칙 지터",
                "en": "Irregular jitter"
            },
            "help": {
                "ko": "각 행에 독립적인 흔들림을 섞고 좌표를 반올림해 거친 경계를 만듭니다.",
                "en": "Use independent row variation and rounded sampling coordinates for jagged edges."
            },
            "default": false
        },
        {
            "key": "jitter_roughness",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "지터 거칠기",
                "en": "Jitter roughness"
            },
            "help": {
                "ko": "행별 불규칙 성분을 키웁니다. 지터 진폭이 0이면 영향이 없습니다.",
                "en": "Increase irregular row variation. Inactive at zero jitter amplitude."
            },
            "min": 0.3,
            "max": 10.0,
            "step": 0.1,
            "default": 0.3
        },
        {
            "key": "head_switch_rows",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "헤드 스위칭 높이",
                "en": "Head-switching height"
            },
            "help": {
                "ko": "화면 아래의 헤드 스위칭 노이즈 띠 높이입니다. 480줄 기준으로 비례 조정합니다.",
                "en": "Height of the bottom noise band, scaled relative to 480 image rows."
            },
            "min": 0.0,
            "max": 100.0,
            "step": 1.0,
            "default": 15.0
        },
        {
            "key": "head_switch_pull",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "하단 휘어짐",
                "en": "Bottom-edge pull"
            },
            "help": {
                "ko": "하단 노이즈 띠 안에서 화면을 가로로 잡아당깁니다.",
                "en": "Horizontal pull inside the bottom head-switching band."
            },
            "min": 0.0,
            "max": 50.0,
            "step": 0.1,
            "default": 30.0
        },
        {
            "key": "head_switch_noise",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "하단 노이즈 밀도",
                "en": "Bottom noise density"
            },
            "help": {
                "ko": "하단 띠에서 밝기와 색이 손상되는 픽셀의 비율입니다.",
                "en": "Probability of luma and chroma corruption inside the bottom band."
            },
            "min": 0.0,
            "max": 1.0,
            "step": 0.05,
            "default": 0.4
        },
        {
            "key": "dropout_count",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "드롭아웃 개수",
                "en": "Dropout count"
            },
            "help": {
                "ko": "수평으로 짧게 끊기는 테이프 손상 자국을 만듭니다.",
                "en": "Number of short horizontal tape-loss streaks."
            },
            "min": 0.0,
            "max": 50.0,
            "step": 1.0,
            "default": 2.0
        },
        {
            "key": "dropout_max_len",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "흠집 최대 길이",
                "en": "Maximum scratch length"
            },
            "help": {
                "ko": "흠집 하나의 최대 길이입니다. 720px 기준으로 비례 조정됩니다.",
                "en": "Maximum streak length, scaled relative to 720px image width."
            },
            "min": 10.0,
            "max": 200.0,
            "step": 1.0,
            "default": 80.0
        },
        {
            "key": "dropout_noise_freq",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "흠집 강도",
                "en": "Scratch intensity"
            },
            "help": {
                "ko": "흠집의 밝기와 불규칙한 끊김을 조정합니다. 0이면 흠집이 표시되지 않습니다.",
                "en": "Strength and irregularity of streaks. Zero hides them."
            },
            "min": 0.0,
            "max": 1.0,
            "step": 0.1,
            "default": 0.8
        },
        {
            "key": "apply_scanlines",
            "type": "checkbox",
            "group": 3,
            "label": {
                "ko": "스캔라인",
                "en": "Scanlines"
            },
            "help": {
                "ko": "CRT 디스플레이의 줄무늬를 선택적으로 더합니다. VHS 테이프 자체의 신호는 아닙니다.",
                "en": "Optional CRT display stripes; not an intrinsic tape-recording artifact."
            },
            "default": false
        },
        {
            "key": "scanline_weight",
            "type": "range",
            "group": 3,
            "label": {
                "ko": "스캔라인 밝기",
                "en": "Scanline brightness"
            },
            "help": {
                "ko": "어두운 줄의 밝기 배율입니다. 1.00이면 보이지 않습니다.",
                "en": "Brightness multiplier for the darker rows. 1.00 makes them invisible."
            },
            "min": 0.5,
            "max": 1.0,
            "step": 0.01,
            "default": 0.75,
            "parent": "apply_scanlines"
        }
    ];
    var groups = [
        { ko: '디지털 열화', en: 'Digital degradation', ja: 'デジタル圧殺' },
        { ko: '기기 특성', en: 'Hardware character', ja: '機材の虚飾' },
        { ko: '아날로그 신호', en: 'Analog signal', ja: '磁気の限界' },
        { ko: '기계적 오류', en: 'Mechanical errors', ja: 'メカニカル・エラー' }
    ];
    var defaults = Object.freeze(Object.fromEntries(definitions.map(function (p)
    {
        return [p.key, p.default];
    })));
    function normalize(input = {})
    {
        if (!input || typeof input !== 'object' || Array.isArray(input))
            input = {};
        var out = {};
        for (var items1 = definitions, index1 = 0; index1 < items1.length; index1++)
        {
            var p = items1[index1];
            var value = input[p.key];
            if (p.type === 'checkbox')
            {
                out[p.key] = typeof value === 'boolean' ? value : p.default;
                continue;
            }
            var n = typeof value === 'number' && Number.isFinite(value) ? value : p.default;
            n = Math.min(p.max, Math.max(p.min, n));
            out[p.key] = +Math.min(p.max, Math.max(p.min, p.min + Math.round((n - p.min) / p.step) * p.step)).toFixed(6);
        }
        return out;
    }
    var presets = {
        standard: { ...defaults },
        soft: { ...defaults, apply_jpeg: false, sharpen_amount: 1.5, cutoff_y: 0.65, cutoff_i: 0.055, cutoff_q: 0.055, chroma_crosstalk: 0.2, chroma_shift_x: 1, noise_intensity_y: 0.009, noise_intensity_c: 0.004, jitter_amp: 0.2, head_switch_rows: 5, head_switch_pull: 8, head_switch_noise: 0.15, dropout_count: 0 },
        worn: { ...defaults, jpeg_quality: 36, sharpen_amount: 4.4, cutoff_y: 0.26, cutoff_i: 0.019, cutoff_q: 0.021, chroma_crosstalk: 0.65, chroma_shift_x: 6, noise_intensity_y: 0.04, noise_intensity_c: 0.023, jitter_amp: 1.6, classic_jitter: true, jitter_roughness: 1.2, head_switch_rows: 28, head_switch_pull: 38, head_switch_noise: 0.65, dropout_count: 11, dropout_max_len: 130 },
        crt: { ...defaults, apply_jpeg: false, apply_scanlines: true, scanline_weight: 0.70, dropout_count: 0, head_switch_rows: 0, jitter_amp: 0.2 }
    };
    var api = { definitions: definitions, groups: groups, defaults: defaults, normalize: normalize, presets: presets };
    root.RVEParameters = api;
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
})(globalThis);

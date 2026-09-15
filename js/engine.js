/* ========================================================================
 * RETRO VIDEO EFFECTOR                          DESKTOP EDITION / REV. 2.0
 * FILE    : ENGINE.JS
 * MODULE  : ANALOG SIGNAL KERNEL
 * PURPOSE : RGB TO YIQ / BANDWIDTH / JITTER / NOISE / RGB OUTPUT
 * REM     : VINTAGE SOURCE STYLE. MODERN BROWSER SERVICES REMAIN IN USE.
 * ======================================================================== */
function createRVEEngine()
{
    'use strict';
    var clamp = function (x, a, b)
    {
        return Math.min(b, Math.max(a, x));
    };
    function makeRng(seed)
    {
        var s = (seed >>> 0) || 0x6d2b79f5;
        return function ()
        {
            s ^= s << 13;
            s ^= s >>> 17;
            s ^= s << 5;
            return (s >>> 0) / 4294967296;
        };
    }
    function sample(plane, offset, x, w)
    {
        x = clamp(x, 0, w - 1);
        var a = Math.floor(x), b = Math.min(w - 1, a + 1), t = x - a;
        return plane[offset + a] * (1 - t) + plane[offset + b] * t;
    }
    /** Causal one-pole filter: reduced chroma bandwidth also creates a color trail. */
    function horizontalLowpass(plane, w, h, cutoff, scale, bypass = false)
    {
        if (bypass)
            return;
        var a = 1 - Math.exp(-2 * Math.PI * cutoff / scale);
        for (var y = 0; y < h; y++)
        {
            var row = y * w;
            var v = plane[row];
            for (var x = 1; x < w; x++)
            {
                var i = row + x;
                v += a * (plane[i] - v);
                plane[i] = v;
            }
        }
    }
    function verticalChroma(plane, w, h, amount)
    {
        if (!amount)
            return;
        for (var y = 1; y < h; y++)
        {
            var row = y * w, prev = row - w;
            for (var x = 0; x < w; x++)
                plane[row + x] = (1 - amount) * plane[row + x] + amount * plane[prev + x];
        }
    }
    function ring(plane, w, h, radius, amount)
    {
        if (amount === 0)
            return;
        var line = new Float32Array(w), count = 2 * radius + 1;
        for (var y = 0; y < h; y++)
        {
            var row = y * w;
            line.set(plane.subarray(row, row + w));
            var sum = 0;
            for (var k = -radius; k <= radius; k++)
                sum += line[clamp(k, 0, w - 1)];
            for (var x = 0; x < w; x++)
            {
                plane[row + x] = line[x] + amount * (line[x] - sum / count);
                sum -= line[clamp(x - radius, 0, w - 1)];
                sum += line[clamp(x + radius + 1, 0, w - 1)];
            }
        }
    }
    /** Caller supplies normalized controls; JPEG re-encoding happens in the browser layer. */
    function process(rgba, w, h, p, seed = 1994)
    {
        if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w * h > 4000000 || w > 2560 || h > 2560)
            throw new Error('Invalid processing dimensions (max 4 MP, 2560px per side).');
        if (!(rgba instanceof Uint8ClampedArray) || rgba.length !== w * h * 4)
            throw new Error('Expected a complete RGBA buffer.');
        if (!p || typeof p !== 'object')
            throw new Error('Missing processing parameters.');
        var start = typeof performance !== 'undefined' ? performance.now() : Date.now();
        var n = w * h, Y = new Float32Array(n), I = new Float32Array(n), Q = new Float32Array(n);
        var low = p.tone_low / 255, span = (p.tone_high - p.tone_low) / 255;
        if (!(span > 0))
            throw new Error('Invalid tone range.');
        var rg = p.apply_color_cast ? p.cast_r : 1, gg = p.apply_color_cast ? p.cast_g : 1, bg = p.apply_color_cast ? p.cast_b : 1;
        for (var i = 0; i < n; i++)
        {
            var k = i * 4;
            var r = clamp((rgba[k] / 255 - low) / span, 0, 1) * rg;
            var g = clamp((rgba[k + 1] / 255 - low) / span, 0, 1) * gg;
            var b = clamp((rgba[k + 2] / 255 - low) / span, 0, 1) * bg;
            Y[i] = .299 * r + .587 * g + .114 * b;
            I[i] = .595716 * r - .274453 * g - .321263 * b;
            Q[i] = .211456 * r - .522591 * g + .311135 * b;
        }
        var sx = Math.max(w / 720, 1 / 720), sy = Math.max(h / 480, 1 / 480);
        if (p.apply_strong_ringing)
            ring(Y, w, h, Math.max(1, Math.round(p.sharpen_size * sx)), p.sharpen_amount);
        horizontalLowpass(Y, w, h, p.cutoff_y, sx, p.cutoff_y >= 1);
        horizontalLowpass(I, w, h, p.cutoff_i, sx);
        horizontalLowpass(Q, w, h, p.cutoff_q, sx);
        verticalChroma(I, w, h, p.chroma_crosstalk);
        verticalChroma(Q, w, h, p.chroma_crosstalk);
        /* Separate streams prevent a change in one noise control from reseeding another. */
        var nr = makeRng(seed ^ 0x9e3779b9), jr = makeRng(seed ^ 0x243f6a88), hr = makeRng(seed ^ 0xb7e15162);
        var dr = makeRng(seed ^ 0xdeadbeef), phase = makeRng(seed ^ 0xa4093822)() * Math.PI * 2;
        var out = new Uint8ClampedArray(rgba.length);
        var headRows = p.head_switch_rows === 0 ? 0 : Math.max(1, Math.min(h, Math.round(p.head_switch_rows * sy)));
        var chromaShift = p.chroma_shift_x * sx;
        for (var y = 0; y < h; y++)
        {
            var row = y * w, yr = y / sy;
            var wave = Math.sin(2 * Math.PI * p.jitter_freq * yr + phase) + .28 * Math.sin(2 * Math.PI * p.jitter_freq * yr * .37 + phase * .5);
            var rough = (jr() * 2 - 1) * p.jitter_roughness * (p.classic_jitter ? .65 : .12);
            var dx = p.jitter_amp * sx * (wave + rough);
            var inHead = headRows > 0 && y >= h - headRows;
            var ht = inHead ? (y - (h - headRows) + 1) / headRows : 0;
            if (inHead)
                dx += p.head_switch_pull * sx * ht * ht;
            if (p.classic_jitter)
                dx = Math.round(dx);
            var scan = p.apply_scanlines && (Math.floor(yr) % 2 === 1) ? p.scanline_weight : 1;
            for (var x = 0; x < w; x++)
            {
                var idx = row + x, k = idx * 4;
                var l = sample(Y, row, x - dx, w), i = sample(I, row, x - dx - chromaShift, w), q = sample(Q, row, x - dx - chromaShift, w);
                /* Sum of three independent uniforms: bounded, approximately bell-shaped noise. */
                l += (nr() + nr() + nr() - 1.5) * p.noise_intensity_y * 2;
                i += (nr() + nr() + nr() - 1.5) * p.noise_intensity_c * 2;
                q += (nr() + nr() + nr() - 1.5) * p.noise_intensity_c * 2;
                if (inHead && hr() < p.head_switch_noise)
                {
                    l = l * (1 - .45 * ht) + hr() * .7 * ht;
                    i *= 1 - .65 * ht;
                    q *= 1 - .65 * ht;
                }
                out[k] = clamp((l + .9562957198 * i + .6210244165 * q) * scan, 0, 1) * 255;
                out[k + 1] = clamp((l - .2721220993 * i - .6473805968 * q) * scan, 0, 1) * 255;
                out[k + 2] = clamp((l - 1.1069890167 * i + 1.7046149984 * q) * scan, 0, 1) * 255;
                out[k + 3] = rgba[k + 3];
            }
        }
        if (p.dropout_count > 0 && p.dropout_noise_freq > 0)
        {
            for (var d = 0; d < p.dropout_count; d++)
            {
                var y = Math.floor(dr() * h), x0 = Math.floor(dr() * w);
                var len = Math.max(1, Math.round((.2 + .8 * dr()) * p.dropout_max_len * sx));
                var thickness = Math.max(1, Math.round(sy * (dr() < .13 ? 2 : 1)));
                for (var yy = y; yy < Math.min(h, y + thickness); yy++)
                {
                    for (var x = x0; x < Math.min(w, x0 + len); x++)
                    {
                        var k = (yy * w + x) * 4;
                        var tail = Math.pow(1 - (x - x0) / len, .45);
                        var mix = p.dropout_noise_freq * tail * (.3 + .7 * dr());
                        var bright = 195 + 60 * dr();
                        for (var c = 0; c < 3; c++)
                            out[k + c] = out[k + c] * (1 - mix) + bright * mix;
                    }
                }
            }
        }
        var end = typeof performance !== 'undefined' ? performance.now() : Date.now();
        return { data: out, width: w, height: h, milliseconds: end - start };
    }
    return Object.freeze({ process: process, makeRng: makeRng });
}
if (typeof module !== 'undefined' && module.exports)
    module.exports = { createRVEEngine: createRVEEngine };

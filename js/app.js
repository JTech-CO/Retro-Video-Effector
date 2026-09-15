/* ========================================================================
 * RETRO VIDEO EFFECTOR                          APPLICATION EDITION / REV. 2.1
 * FILE    : APP.JS
 * MODULE  : MAIN PROGRAM
 * PURPOSE : LOCAL FILE DECODING / JOB QUEUE / PROPERTY SHEET / EXPORT
 * REM     : VINTAGE SOURCE STYLE. MODERN BROWSER SERVICES REMAIN IN USE.
 * ======================================================================== */
(function ()
{
    'use strict';
    var $ = function (id)
    {
        return document.getElementById(id);
    };
    var P = RVEParameters;
    var texts = RVEText;
    var lang = 'ko';
    try
    {
        var v = localStorage.getItem('rve-language');
        if (v === 'KR' || v === 'kr') v = 'ko';
        if (["ko", "en"].indexOf(v) !== -1)
            lang = v;
    }
    catch (_)
    {
    }
    var t = function (key)
    {
        return texts[lang][key] || texts.en[key] || key;
    };
    var processor = new RVEProcessor();
    var params = { ...P.defaults }, seed = 1994, resolution = 'native', preset = 'standard';
    var source = null, base = null, pixels = null, resultCanvas = null, jpegCache = null;
    var version = 0, applied = 0, processingPromise = null, renderTimer = null, renderError = null, loadId = 0;
    var compare = false, original = false, holdOriginal = false, exporting = false, isLoading = false;
    var activeTab = 0;
    var lastMilliseconds = null, toastKey = null, toastSuffix = '';
    var shareSupported = false;
    try
    {
        shareSupported = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' &&
            navigator.canShare({ files: [new File(['RVE'], 'image.png', { type: 'image/png' })] });
    }
    catch (_) { shareSupported = false; }
    $('btn-share').hidden = !shareSupported;
    var zoom = 1, panX = 0, panY = 0, autoFit = true, toastTimer, helpOwner = null;
    var canvas = $('main-canvas'), viewport = $('preview-viewport'), ctx = canvas.getContext('2d');
    var decodeLimit = 40000000, sizeLimit = 40 * 1024 * 1024;
    function toast(message, error = false)
    {
        clearTimeout(toastTimer);
        toastKey = Object.keys(texts[lang]).sort(function (a, b) { return texts[lang][b].length - texts[lang][a].length; }).find(function (key)
        {
            return message === texts[lang][key] || message.indexOf(texts[lang][key] + ' ') === 0;
        }) || null;
        toastSuffix = toastKey ? message.slice(texts[lang][toastKey].length) : '';
        $('toast').setAttribute('role', error ? 'alert' : 'status');
        $('toast').textContent = message;
        $('toast').classList.toggle('error', error);
        $('toast').hidden = false;
        toastTimer = setTimeout(function ()
        {
            return $('toast').hidden = true;
        }, error ? 6500 : 3600);
    }
    function makeCanvas(w, h)
    {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }
    function canvasBlob(c, type = 'image/png', quality = .95)
    {
        return new Promise(function (resolve, reject)
        {
            return c.toBlob(function (b)
            {
                return b ? resolve(b) : reject(new Error(t('saveFailed')));
            }, type, quality);
        });
    }
    async function decodeBlob(blob)
    {
        if (typeof createImageBitmap === 'function')
        {
            try
            {
                return await createImageBitmap(blob);
            }
            catch (_) { /* 0401 / FALL THROUGH TO THE DOM IMAGE DECODER. */
            }
        }
        var url = URL.createObjectURL(blob), image = new Image();
        try
        {
            await new Promise(function (resolve, reject)
            {
                image.onload = resolve;
                image.onerror = function ()
                {
                    return reject(new Error(t('decodeError')));
                };
                image.src = url;
            });
            return image;
        }
        finally
        {
            URL.revokeObjectURL(url);
        }
    }
    /* 0200 / PROPERTY SHEET: ONE TAB PER SIGNAL PROCESSING BANK. */
    function selectTab(index, focus)
    {
        activeTab = Math.max(0, Math.min(P.groups.length - 1, index));
        document.querySelectorAll('.property-tab').forEach(function (button, i)
        {
            button.setAttribute('aria-selected', String(i === activeTab));
            button.tabIndex = i === activeTab ? 0 : -1;
            $('parameter-page-' + i).hidden = i !== activeTab;
            if (focus && i === activeTab)
                button.focus();
        });
        $('panel-content').scrollTop = 0;
        hideHelp();
    }
    function buildParameters()
    {
        var parent = $('parameters-container'), tabs = $('property-tabs');
        parent.replaceChildren();
        tabs.replaceChildren();
        P.groups.forEach(function (g, index)
        {
            var tab = document.createElement('button');
            tab.type = 'button';
            tab.id = 'property-tab-' + index;
            tab.className = 'property-tab';
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', 'parameter-page-' + index);
            tab.textContent = t('tab' + index);
            tab.addEventListener('click', function ()
            {
                selectTab(index, false);
            });
            tab.addEventListener('keydown', function (event)
            {
                var next = index;
                if (event.key === 'ArrowRight')
                    next = (index + 1) % P.groups.length;
                else if (event.key === 'ArrowLeft')
                    next = (index + P.groups.length - 1) % P.groups.length;
                else if (event.key === 'Home')
                    next = 0;
                else if (event.key === 'End')
                    next = P.groups.length - 1;
                else
                    return;
                event.preventDefault();
                selectTab(next, true);
            });
            tabs.append(tab);
            var section = document.createElement('section');
            section.className = 'param-section';
            section.id = 'parameter-page-' + index;
            section.setAttribute('role', 'tabpanel');
            section.setAttribute('aria-labelledby', tab.id);
            var heading = document.createElement('h3');
            heading.textContent = g[lang];
                        section.append(heading);
            P.definitions.filter(function (v)
            {
                return v.group === index;
            }).forEach(function (p)
            {
                var help = document.createElement('button');
                help.type = 'button';
                help.className = 'info-btn';
                help.textContent = '?';
                help.setAttribute('aria-label', p.label[lang] + ' / ' + t('info'));
                help.dataset.help = p.key;
                var input = document.createElement('input');
                input.id = 'p_' + p.key;
                input.className = 'param-input';
                input.type = p.type;
                input.dataset.param = p.key;
                var label = document.createElement('label');
                label.htmlFor = input.id;
                if (p.type === 'checkbox')
                {
                    var row = document.createElement('div');
                    row.className = 'check-row';
                    label.className = 'check-label';
                    var span = document.createElement('span');
                    span.textContent = p.label[lang];
                    label.append(input, span);
                    row.append(label, help);
                    section.append(row);
                }
                else
                {
                    input.min = p.min;
                    input.max = p.max;
                    input.step = p.step;
                    var row = document.createElement('div');
                    row.className = 'control-group';
                    row.dataset.control = p.key;
                    var header = document.createElement('div');
                    header.className = 'slider-header';
                    label.textContent = p.label[lang];
                    var output = document.createElement('output');
                    output.id = 'val_' + p.key;
                    output.htmlFor = input.id;
                    output.className = 'val-display';
                    header.append(label, help, output);
                    row.append(header, input);
                    section.append(row);
                }
                input.addEventListener('input', function ()
                {
                    params[p.key] = p.type === 'checkbox' ? input.checked : Number(input.value);
                    params = P.normalize(params);
                    preset = 'custom';
                    syncControls();
                    requestRender();
                });
                help.addEventListener('click', function (event)
                {
                    event.stopPropagation();
                    showHelp(help, p);
                });
            });
            parent.append(section);
        });
        selectTab(activeTab, false);
        syncControls();
    }
    function digits(p)
    {
        return p.step >= 1 ? 0 : (String(p.step).split('.')[1] || '').length;
    }
    function syncControls()
    {
        for (var items1 = P.definitions, index1 = 0; index1 < items1.length; index1++)
        {
            var p = items1[index1];
            var input = $('p_' + p.key);
            if (!input)
                continue;
            if (p.type === 'checkbox')
                input.checked = params[p.key];
            else
            {
                input.value = params[p.key];
                $('val_' + p.key).textContent = params[p.key].toFixed(digits(p));
            }
            var disabled = !!p.parent && !params[p.parent];
            input.disabled = disabled;
            input.closest('.control-group')?.classList.toggle('disabled', disabled);
        }
        $('preset-select').value = preset;
        $('seed-input').value = seed;
        $('resolution-select').value = resolution;
    }
    function applyLanguage()
    {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-i18n]').forEach(function (e)
        {
            return e.textContent = t(e.dataset.i18n);
        });
        document.querySelectorAll('[data-tip]').forEach(function (e)
        {
            e.title = t(e.dataset.tip);
            e.setAttribute('aria-label', t(e.dataset.tip));
        });
        document.querySelectorAll('[data-aria]').forEach(function (e)
        {
            return e.setAttribute('aria-label', t(e.dataset.aria));
        });
        document.querySelectorAll('[data-dir]').forEach(function (e)
        {
            return e.setAttribute('aria-label', t(e.dataset.dir));
        });
        $('btn-zoom-in').setAttribute('aria-label', t('zoomIn'));
        $('btn-zoom-out').setAttribute('aria-label', t('zoomOut'));
        document.querySelectorAll('[data-language]').forEach(function (button)
        {
            button.setAttribute('aria-pressed', String(button.dataset.language === lang));
        });
        document.querySelectorAll('[data-meta]').forEach(function (meta)
        {
            meta.content = t(meta.dataset.meta);
        });
        if (!$('toast').hidden && toastKey) $('toast').textContent = t(toastKey) + toastSuffix;
        $('btn-download').textContent = t(exporting ? 'saveWorking' : 'download');
        updatePerformance();
        var sc = $('panel-content').scrollTop;
        buildParameters();
        $('panel-content').scrollTop = sc;
        if (!source)
            $('file-name').textContent = t('noImage');
        else
            $('file-name').textContent = source.demo ? t('demoName') : source.name;
        hideHelp();
        paint();
        document.dispatchEvent(new Event('rve-language'));
    }
    function updatePerformance()
    {
        $('performance-label').textContent = lastMilliseconds === null ? t('readyStatus') :
            lastMilliseconds + ' ms / ' + t(processor.mode === 'Worker' ? 'workerLabel' : 'mainLabel');
    }
    function syncImageCommands()
    {
        var unavailable = !base || isLoading;
        ['btn-fit', 'btn-zoom-in', 'btn-zoom-out', 'zoom-slider', 'btn-original',
            'compare-slider', 'btn-compare', 'btn-export'].forEach(function (id)
        {
            $(id).disabled = unavailable;
        });
        document.querySelectorAll('[data-dir]').forEach(function (button) { button.disabled = unavailable; });
        $('btn-share').disabled = unavailable || !shareSupported || exporting;
        $('btn-download').disabled = unavailable || exporting;
    }
    function showHelp(button, p)
    {
        if (helpOwner === button && !$('info-popup').hidden)
        {
            hideHelp();
            return;
        }
        var box = $('info-popup');
        box.textContent = p.help[lang];
        box.hidden = false;
        helpOwner = button;
        button.setAttribute('aria-describedby', 'info-popup');
        var r = button.getBoundingClientRect();
        var left = Math.min(innerWidth - box.offsetWidth - 12, Math.max(12, r.left - 30)), top = r.bottom + 10;
        if (top + box.offsetHeight > innerHeight - 12)
            top = r.top - box.offsetHeight - 10;
        box.style.left = left + 'px';
        box.style.top = Math.max(12, top) + 'px';
    }
    function hideHelp()
    {
        helpOwner?.removeAttribute('aria-describedby');
        helpOwner = null;
        $('info-popup').hidden = true;
    }
    /* 0300 / CHECK THE FILE HEADER BEFORE ALLOCATING LARGE IMAGE BUFFERS. */
    async function validateRaster(file)
    {
        if (file.size > sizeLimit)
            throw new Error(t('fileSizeError'));
        if (file.size < 8)
            throw new Error(t('fileTypeError'));
        var a = new Uint8Array(await file.slice(0, 262144).arrayBuffer()), dv = new DataView(a.buffer);
        var str = function (i, n)
        {
            return String.fromCharCode(...a.subarray(i, i + n));
        };
        var recognized = false, w = 0, h = 0;
        if (str(1, 3) === 'PNG' && a[0] === 137 && a.length >= 24)
        {
            recognized = true;
            w = dv.getUint32(16);
            h = dv.getUint32(20);
        }
        else if (a[0] === 255 && a[1] === 216 && a[2] === 255)
        {
            recognized = true;
            var pos = 2;
            while (pos + 4 < a.length)
            {
                if (a[pos] !== 255)
                {
                    pos++;
                    continue;
                }
                var marker = a[pos + 1];
                pos += 2;
                if (marker === 0xd9 || marker === 0xda)
                    break;
                if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7))
                    continue;
                var len = dv.getUint16(pos);
                if (len < 2 || pos + len > a.length)
                    break;
                if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && len >= 7)
                {
                    h = dv.getUint16(pos + 3);
                    w = dv.getUint16(pos + 5);
                    break;
                }
                pos += len;
            }
        }
        else if (str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP')
        {
            recognized = true;
            if (str(12, 4) === 'VP8X' && a.length >= 30)
            {
                w = 1 + a[24] + (a[25] << 8) + (a[26] << 16);
                h = 1 + a[27] + (a[28] << 8) + (a[29] << 16);
            }
        }
        else if (['GIF87a', 'GIF89a'].includes(str(0, 6)) && a.length >= 10)
        {
            recognized = true;
            w = dv.getUint16(6, true);
            h = dv.getUint16(8, true);
        }
        else if (str(0, 2) === 'BM')
        {
            recognized = true;
            if (a.length >= 26 && dv.getUint32(14, true) >= 40)
            {
                w = Math.abs(dv.getInt32(18, true));
                h = Math.abs(dv.getInt32(22, true));
            }
        }
        else if (str(4, 4) === 'ftyp' && /avif|avis/.test(str(8, Math.min(40, a.length - 8))))
            recognized = true;
        if (!recognized)
            throw new Error(t('fileTypeError'));
        if (w * h > decodeLimit || w > 32768 || h > 32768)
            throw new Error(t('pixelLimitError'));
    }
    async function loadFile(file)
    {
        if (!file)
            return;
        var id = ++loadId;
        isLoading = true;
        document.body.dataset.state = 'loading';
        syncImageCommands();
        $('render-status').hidden = false;
        ['btn-export', 'btn-share', 'btn-download'].forEach(function (key)
        {
            return $(key).disabled = true;
        });
        try
        {
            await validateRaster(file);
            if (id !== loadId)
                return;
            document.body.dataset.state = 'loading';
            $('render-status').hidden = false;
            var image = await decodeBlob(file);
            if (id !== loadId)
            {
                image.close?.();
                return;
            }
            var w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
            if (!w || !h || w * h > decodeLimit || w > 32768 || h > 32768)
            {
                image.close?.();
                throw new Error(t('pixelLimitError'));
            }
            installSource({ image: image, width: w, height: h, name: file.name, demo: false });
        }
        catch (e)
        {
            if (id === loadId)
            {
                toast(e.message || t('decodeError'), true);
                $('render-status').hidden = true;
                document.body.dataset.state = source ? 'ready' : 'empty';
            }
        }
        finally
        {
            if (id === loadId)
            {
                isLoading = false;
                ['btn-export', 'btn-share'].forEach(function (key)
                {
                    return $(key).disabled = !source;
                });
                $('btn-download').disabled = exporting || !source;
            }
            $('file-upload').value = '';
            syncImageCommands();
        }
    }
    function installSource(next)
    {
        source?.image.close?.();
        source = next;
        isLoading = false;
        original = false;
        holdOriginal = false;
        renderError = null;
        $('drop-zone').hidden = true;
        $('canvas-container').hidden = false;
        $('image-hud').hidden = false;
        $('dpad-container').hidden = false;
        ['btn-export', 'btn-share', 'btn-compare'].forEach(function (id)
        {
            return $(id).disabled = false;
        });
        $('file-name').textContent = next.demo ? t('demoName') : next.name;
        $('file-name').title = next.name;
        rebuildBase();
        syncImageCommands();
    }
    function rebuildBase()
    {
        if (!source)
            return;
        var requested = resolution === 'native' ? 2560 : Number(resolution);
        var scale = Math.min(1, requested / source.width, requested / source.height, Math.sqrt(4000000 / (source.width * source.height)));
        var w = Math.max(1, Math.floor(source.width * scale)), h = Math.max(1, Math.floor(source.height * scale));
        base = makeCanvas(w, h);
        var c = base.getContext('2d', { willReadFrequently: true });
        c.fillStyle = '#000';
        c.fillRect(0, 0, w, h);
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(source.image, 0, 0, w, h);
        pixels = c.getImageData(0, 0, w, h).data;
        jpegCache = null;
        resultCanvas = null;
        canvas.width = w;
        canvas.height = h;
        $('file-dimensions').textContent = `${w} × ${h}`;
        $('export-size').textContent = `${w} × ${h} px`;
        if (resolution === 'native' && scale < 1)
            toast(t('scaledNotice') + ` ${w} × ${h}`);
        paint();
        fit();
        requestRender(0);
    }
    async function getInput(snapshot, raw, options)
    {
        if (!options.apply_jpeg)
            return raw;
        if (jpegCache && jpegCache.source === snapshot && jpegCache.quality === options.jpeg_quality)
            return jpegCache.data;
        var blob = await canvasBlob(snapshot, 'image/jpeg', options.jpeg_quality / 100);
        var bitmap = await decodeBlob(blob), temp = makeCanvas(snapshot.width, snapshot.height), c = temp.getContext('2d', { willReadFrequently: true });
        c.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        var data = c.getImageData(0, 0, temp.width, temp.height).data;
        if (base === snapshot)
            jpegCache = { source: snapshot, quality: options.jpeg_quality, data: data };
        temp.width = 1;
        temp.height = 1;
        return data;
    }
    /* 0400 / COALESCE REQUESTS. ONLY THE LATEST COMPLETED VERSION IS COMMITTED. */
    function requestRender(delay = 90)
    {
        version++;
        renderError = null;
        if (!base)
            return;
        document.body.dataset.state = 'processing';
        $('render-status').hidden = false;
        clearTimeout(renderTimer);
        renderTimer = setTimeout(function ()
        {
            renderTimer = null;
            startRendering();
        }, delay);
    }
    function startRendering()
    {
        if (processingPromise)
            return processingPromise;
        processingPromise = renderLoop().finally(function ()
        {
            processingPromise = null;
        });
        return processingPromise;
    }
    async function renderLoop()
    {
        try
        {
            while (base && applied !== version)
            {
                var v = version, snapshot = base, raw = pixels, options = { ...params }, s = seed;
                var input = await getInput(snapshot, raw, options);
                if (v !== version || base !== snapshot)
                    continue;
                var r = await processor.run(input, snapshot.width, snapshot.height, options, s);
                if (v !== version || base !== snapshot)
                    continue;
                resultCanvas = makeCanvas(snapshot.width, snapshot.height);
                resultCanvas.getContext('2d').putImageData(new ImageData(r.data, snapshot.width, snapshot.height), 0, 0);
                applied = v;
                renderError = null;
                lastMilliseconds = Math.round(r.milliseconds);
                updatePerformance();
                paint();
            }
            document.body.dataset.state = isLoading ? 'loading' : base ? 'ready' : 'empty';
        }
        catch (e)
        {
            renderError = e;
            applied = version;
            document.body.dataset.state = 'error';
            toast(t('renderFailed') + ' ' + e.message, true);
        }
        finally
        {
            $('render-status').hidden = !isLoading;
        }
    }
    async function ensureRendered()
    {
        if (isLoading)
            throw new Error(t('loading'));
        if (!source)
            throw new Error(t('needImage'));
        clearTimeout(renderTimer);
        renderTimer = null;
        await startRendering();
        if (applied !== version)
            await startRendering();
        if (renderError)
            throw renderError;
        if (!resultCanvas)
            throw new Error(t('renderFailed'));
        return resultCanvas;
    }
    function paint()
    {
        var showOriginal = original || holdOriginal;
        $('btn-original').classList.toggle('active', showOriginal);
        $('btn-original').setAttribute('aria-pressed', String(showOriginal));
        $('btn-original').textContent = t(showOriginal ? 'originalActive' : 'original');
        $('view-label').textContent = t(showOriginal ? 'originalShort' : compare ? 'compareShort' : 'processed');
        $('main-canvas').setAttribute('aria-label', $('view-label').textContent);
        if (!base)
            return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (showOriginal || !resultCanvas)
            ctx.drawImage(base, 0, 0);
        else if (compare)
        {
            ctx.drawImage(resultCanvas, 0, 0);
            var cut = Math.round(canvas.width * Number($('compare-slider').value) / 100);
            if (cut > 0)
                ctx.drawImage(base, 0, 0, cut, base.height, 0, 0, cut, base.height);
            if (cut > 0 && cut < canvas.width)
            {
                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.fillRect(cut - 1, 0, 2, canvas.height);
            }
        }
        else
            ctx.drawImage(resultCanvas, 0, 0);
    }
    /* 0500 / VIEWPORT COORDINATES. THE PROPERTY SHEET NEVER OVERLAPS IT. */
    function region()
    {
        return { x: 0, w: viewport.clientWidth, h: viewport.clientHeight };
    }
    function transform()
    {
        $('canvas-container').style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
        $('canvas-container').classList.toggle('pixel-view', zoom > 1.25);
        $('zoom-slider').value = Math.round(zoom * 100);
        $('zoom-value').textContent = Math.round(zoom * 100) + '%';
    }
    function fit()
    {
        if (!base)
            return;
        var r = region(), margin = innerWidth > 768 ? 72 : 42;
        zoom = Math.max(.01, Math.min(1, (r.w - margin) / base.width, (r.h - margin) / base.height));
        panX = r.x + (r.w - base.width * zoom) / 2;
        panY = (r.h - base.height * zoom) / 2;
        autoFit = true;
        transform();
    }
    function zoomAt(value, x, y)
    {
        if (!base)
            return;
        value = Math.min(3, Math.max(.01, value));
        panX = x - (x - panX) * value / zoom;
        panY = y - (y - panY) * value / zoom;
        zoom = value;
        autoFit = false;
        transform();
    }
    function toggleCompare()
    {
        if (!base)
            return;
        compare = !compare;
        original = false;
        holdOriginal = false;
        $('btn-compare').classList.toggle('active', compare);
        $('btn-compare').setAttribute('aria-pressed', String(compare));
        $('compare-bar').hidden = !compare;
        paint();
        if (autoFit)
            requestAnimationFrame(fit);
    }
    /* 0600 / EXPORT THE PIXEL BUFFER, NOT THE MONITOR CHROME. */
    function downloadBlob(blob, name)
    {
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(function ()
        {
            return URL.revokeObjectURL(url);
        }, 30000);
    }
    function stem()
    {
        return (source?.name || 'image').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 90) || 'image';
    }
    async function exportImage(share = false)
    {
        if (exporting)
            return;
        if (share && !shareSupported) { toast(t('noShare'), true); return; }
        exporting = true;
        syncImageCommands();
        $('btn-download').disabled = true;
        $('btn-download').textContent = t('saveWorking');
        try
        {
            var done = await ensureRendered(), snapshot = makeCanvas(done.width, done.height);
            snapshot.getContext('2d').drawImage(done, 0, 0);
            var type = share ? 'image/png' : $('export-format').value, quality = Number($('export-quality').value) / 100;
            var blob = await canvasBlob(snapshot, type, quality);
            var name = `${stem()}-retro.${type === 'image/jpeg' ? 'jpg' : 'png'}`;
            if (share && typeof navigator.share === 'function' && typeof navigator.canShare === 'function')
            {
                var file = new File([blob], name, { type: blob.type });
                if (navigator.canShare({ files: [file] }))
                {
                    await navigator.share({ files: [file] });
                    return;
                }
            }
            downloadBlob(blob, name);
            toast(t(share ? 'fallbackShare' : 'saved'));
            $('export-dialog').close();
        }
        catch (e)
        {
            if (e.name !== 'AbortError')
            {
                toast(t(share ? 'shareFailed' : 'saveFailed'), true);
                console.warn('RVE / EXPORT:', e);
            }
        }
        finally
        {
            exporting = false;
            $('btn-download').disabled = false;
            $('btn-download').textContent = t('download');
            syncImageCommands();
        }
    }
    function openExport()
    {
        if (isLoading)
        {
            toast(t('loading'));
            return;
        }
        if (!source)
        {
            toast(t('needImage'));
            return;
        }
        $('export-size').textContent = `${base.width} × ${base.height} px`;
        if (!$('export-dialog').open)
            $('export-dialog').showModal();
    }
    /* 0700 / CONFIGURATION RECORDS. KEEP VERSION-1 READ COMPATIBILITY. */
    function saveSettings()
    {
        var data = { schema: 'retro-video-effector/settings', version: 2, engine: 'rve-js-2.0.0', parameters: P.normalize(params), seed: seed, resolution: resolution };
        downloadBlob(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }), 'Retro-Video-Effector-settings.json');
    }
    async function loadSettings(file)
    {
        if (!file)
            return;
        try
        {
            if (file.size > 65536)
                throw new Error(t('settingsSizeError'));
            var data = JSON.parse(await file.text());
            var compatible = data && ((data.schema === 'retro-video-effector/settings' && data.version === 2) || (data.schema === 'vhs-local-clone/settings' && data.version === 1));
            if (!compatible || !data.parameters || typeof data.parameters !== 'object' || Array.isArray(data.parameters))
                throw new Error(t('settingsError'));
            var previous = resolution;
            params = P.normalize(data.parameters);
            seed = Number.isInteger(data.seed) && data.seed >= 0 && data.seed <= 4294967295 ? data.seed : 1994;
            resolution = ['native', '1440', '720'].includes(data.resolution) ? data.resolution : 'native';
            preset = 'custom';
            syncControls();
            if (source && previous !== resolution)
                rebuildBase();
            else
                requestRender(0);
            toast(t('settingsLoaded'));
        }
        catch (e)
        {
            toast(e instanceof SyntaxError ? t('settingsError') : e.message, true);
        }
        finally
        {
            $('settings-upload').value = '';
        }
    }
    /* File selection, file-drop and clipboard paste are explicit local user actions. */
    ['btn-upload-trigger', 'btn-drop-upload'].forEach(function (id)
    {
        return $(id).addEventListener('click', function ()
        {
            return $('file-upload').click();
        });
    });
    $('file-upload').addEventListener('change', function ()
    {
        return loadFile($('file-upload').files[0]);
    });
    $('btn-demo').addEventListener('click', function ()
    {
        loadId++;
        var image = createRVEDemo();
        installSource({ image: image, width: image.width, height: image.height, name: 'test-pattern.png', demo: true });
    });
    var dragDepth = 0;
    window.addEventListener('dragover', function (e)
    {
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('drop', function (e)
    {
        e.preventDefault();
        dragDepth = 0;
        $('drop-shield').hidden = true;
        if (e.dataTransfer?.files.length)
            loadFile(e.dataTransfer.files[0]);
    });
    viewport.addEventListener('dragenter', function (e)
    {
        e.preventDefault();
        if (Array.from(e.dataTransfer?.types || []).includes('Files'))
        {
            dragDepth++;
            $('drop-shield').hidden = false;
        }
    });
    viewport.addEventListener('dragleave', function ()
    {
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth)
            $('drop-shield').hidden = true;
    });
    document.addEventListener('paste', function (e)
    {
        if (/INPUT|TEXTAREA/.test(e.target.tagName))
            return;
        var f = Array.from(e.clipboardData?.files || []).find(function (f)
        {
            return f.type.startsWith('image/');
        });
        if (f)
        {
            e.preventDefault();
            loadFile(f);
        }
    });
    /* 0801 / DIRECT LANGUAGE SELECTION. PARAMETERS AND PIXELS STAY IN MEMORY. */
    document.querySelectorAll('[data-language]').forEach(function (button)
    {
        button.addEventListener('click', function ()
        {
            var next = button.dataset.language;
            if (next === lang || ['en', 'ko'].indexOf(next) === -1) return;
            lang = next;
            try { localStorage.setItem('rve-language', lang); }
            catch (_) { /* PRIVATE / RESTRICTED STORAGE: SWITCH STILL WORKS. */ }
            applyLanguage();
        });
    });
    $('btn-info').addEventListener('click', function ()
    {
        if (!$('info-dialog').open)
            $('info-dialog').showModal();
    });
    document.querySelectorAll('[data-close]').forEach(function (b)
    {
        return b.addEventListener('click', function ()
        {
            return $(b.dataset.close).close();
        });
    });
    document.querySelectorAll('dialog').forEach(function (d)
    {
        return d.addEventListener('click', function (e)
        {
            var r = d.getBoundingClientRect();
            if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom))
                d.close();
        });
    });
    $('btn-export').addEventListener('click', openExport);
    $('btn-download').addEventListener('click', function ()
    {
        return exportImage();
    });
    $('btn-share').addEventListener('click', function ()
    {
        return exportImage(true);
    });
    $('export-format').addEventListener('change', function ()
    {
        return $('export-quality-group').hidden = $('export-format').value !== 'image/jpeg';
    });
    $('export-quality').addEventListener('input', function ()
    {
        return $('export-quality-value').textContent = $('export-quality').value;
    });
    $('btn-compare').addEventListener('click', toggleCompare);
    $('compare-slider').addEventListener('input', paint);
    $('btn-original').addEventListener('click', function ()
    {
        original = !original;
        paint();
    });
    $('btn-reset').addEventListener('click', function ()
    {
        params = { ...P.defaults };
        seed = 1994;
        preset = 'standard';
        syncControls();
        requestRender(0);
        toast(t('resetDone'));
    });
    $('preset-select').addEventListener('change', function ()
    {
        var k = $('preset-select').value;
        if (!P.presets[k])
            return;
        params = P.normalize(P.presets[k]);
        preset = k;
        syncControls();
        requestRender(0);
    });
    $('seed-input').addEventListener('change', function ()
    {
        var n = Number($('seed-input').value);
        seed = Number.isFinite(n) ? Math.min(4294967295, Math.max(0, Math.round(n))) : 1994;
        $('seed-input').value = seed;
        requestRender(0);
    });
    $('btn-reseed').addEventListener('click', function ()
    {
        var n = new Uint32Array(1);
        if (globalThis.crypto?.getRandomValues)
            crypto.getRandomValues(n);
        else
            n[0] = Date.now();
        seed = n[0];
        $('seed-input').value = seed;
        requestRender(0);
    });
    $('resolution-select').addEventListener('change', function ()
    {
        resolution = $('resolution-select').value;
        rebuildBase();
    });
    $('btn-settings-save').addEventListener('click', saveSettings);
    $('btn-settings-load').addEventListener('click', function ()
    {
        return $('settings-upload').click();
    });
    $('settings-upload').addEventListener('change', function ()
    {
        return loadSettings($('settings-upload').files[0]);
    });
    $('btn-fit').addEventListener('click', fit);
    $('zoom-slider').addEventListener('input', function ()
    {
        var r = region();
        zoomAt(Number($('zoom-slider').value) / 100, r.x + r.w / 2, r.h / 2);
    });
    ['in', 'out'].forEach(function (dir)
    {
        return $('btn-zoom-' + dir).addEventListener('click', function ()
        {
            var r = region();
            zoomAt(zoom * (dir === 'in' ? 1.2 : 1 / 1.2), r.x + r.w / 2, r.h / 2);
        });
    });
    viewport.addEventListener('wheel', function (e)
    {
        if (!base)
            return;
        e.preventDefault();
        var r = viewport.getBoundingClientRect();
        zoomAt(zoom * Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    var pointers = new Map();
    var gesture = null;
    function startGesture()
    {
        var a = Array.from(pointers.values());
        if (a.length === 1)
            gesture = { type: 'pan', x: a[0].x, y: a[0].y, px: panX, py: panY };
        else if (a.length >= 2)
        {
            var x = (a[0].x + a[1].x) / 2, y = (a[0].y + a[1].y) / 2;
            gesture = { type: 'pinch', distance: Math.max(1, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)), scale: zoom, ax: (x - panX) / zoom, ay: (y - panY) / zoom };
        }
        else
            gesture = null;
    }
    viewport.addEventListener('pointerdown', function (e)
    {
        if (!base || e.target.closest('button,input') || e.button > 0)
            return;
        var r = viewport.getBoundingClientRect();
        pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
        viewport.setPointerCapture(e.pointerId);
        viewport.classList.add('dragging');
        startGesture();
    });
    viewport.addEventListener('pointermove', function (e)
    {
        if (!pointers.has(e.pointerId))
            return;
        var r = viewport.getBoundingClientRect();
        pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
        var a = Array.from(pointers.values());
        if (gesture?.type === 'pan' && a.length === 1)
        {
            panX = gesture.px + a[0].x - gesture.x;
            panY = gesture.py + a[0].y - gesture.y;
        }
        else if (gesture?.type === 'pinch' && a.length >= 2)
        {
            zoom = Math.min(3, Math.max(.01, gesture.scale * Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y) / gesture.distance));
            panX = (a[0].x + a[1].x) / 2 - gesture.ax * zoom;
            panY = (a[0].y + a[1].y) / 2 - gesture.ay * zoom;
        }
        autoFit = false;
        transform();
    });
    function releasePointer(e)
    {
        pointers.delete(e.pointerId);
        startGesture();
        if (!pointers.size)
            viewport.classList.remove('dragging');
    }
    viewport.addEventListener('pointerup', releasePointer);
    viewport.addEventListener('pointercancel', releasePointer);
    viewport.addEventListener('lostpointercapture', releasePointer);
    document.querySelectorAll('[data-dir]').forEach(function (b)
    {
        return b.addEventListener('click', function ()
        {
            if (!base)
                return;
            var d = b.dataset.dir;
            panX += d === 'left' ? -35 : d === 'right' ? 35 : 0;
            panY += d === 'up' ? -35 : d === 'down' ? 35 : 0;
            autoFit = false;
            transform();
        });
    });
    document.addEventListener('pointerdown', function (e)
    {
        if (!e.target.closest('.info-btn'))
            hideHelp();
    });
    $('panel-content').addEventListener('scroll', hideHelp, { passive: true });
    window.addEventListener('scroll', hideHelp, { passive: true });
    window.addEventListener('resize', hideHelp, { passive: true });
    document.addEventListener('keydown', function (e)
    {
        if (e.key === 'Escape')
        {
            hideHelp();
            return;
        }
        if (e.key === 'F1')
        {
            e.preventDefault();
            if (!document.querySelector('dialog[open]'))
                $('info-dialog').showModal();
            return;
        }
        var editing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
        if (document.querySelector('dialog[open]'))
            return;
        if ($('app-window').hidden)
            return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o')
        {
            e.preventDefault();
            $('file-upload').click();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's')
        {
            e.preventDefault();
            openExport();
            return;
        }
        if (editing || e.target.tagName === 'BUTTON' || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey)
            return;
        if (e.code === 'Space')
        {
            e.preventDefault();
            holdOriginal = true;
            paint();
        }
        else if (e.key.toLowerCase() === 'f')
        {
            e.preventDefault();
            fit();
        }
        else if (e.key.toLowerCase() === 'c')
        {
            e.preventDefault();
            toggleCompare();
        }
    });
    document.addEventListener('keyup', function (e)
    {
        if (e.code === 'Space')
        {
            holdOriginal = false;
            paint();
        }
    });
    window.addEventListener('blur', function ()
    {
        holdOriginal = false;
        paint();
    });
    if (typeof ResizeObserver === 'function')
        new ResizeObserver(function ()
        {
            if (autoFit)
                fit();
        }).observe(viewport);
    else
        window.addEventListener('resize', function ()
        {
            if (autoFit)
                fit();
        });
    window.addEventListener('pagehide', function (e)
    {
        if (!e.persisted)
            source?.image.close?.();
    });
    /* 0900 / SESSION TEARDOWN. INVALIDATE PENDING READS BEFORE RELEASING DATA. */
    function clearSession()
    {
        loadId++;
        version++;
        applied = version;
        clearTimeout(renderTimer);
        renderTimer = null;
        source?.image.close?.();
        source = null;
        base = null;
        pixels = null;
        resultCanvas = null;
        jpegCache = null;
        params = { ...P.defaults };
        seed = 1994;
        resolution = 'native';
        preset = 'standard';
        compare = false;
        original = false;
        holdOriginal = false;
        renderError = null;
        isLoading = false;
        zoom = 1;
        panX = 0;
        panY = 0;
        autoFit = true;
        canvas.width = 1;
        canvas.height = 1;
        $('drop-zone').hidden = false;
        $('canvas-container').hidden = true;
        $('image-hud').hidden = true;
        $('dpad-container').hidden = true;
        $('compare-bar').hidden = true;
        $('render-status').hidden = true;
        $('file-name').textContent = t('noImage');
        $('file-name').title = '';
        $('file-dimensions').textContent = '-';
        lastMilliseconds = null;
        updatePerformance();
        ['btn-export', 'btn-share', 'btn-compare', 'btn-download'].forEach(function (id)
        {
            $(id).disabled = true;
        });
        $('btn-compare').classList.remove('active');
        $('btn-compare').setAttribute('aria-pressed', 'false');
        document.body.dataset.state = 'empty';
        selectTab(0, false);
        syncControls();
        transform();
        paint();
        hideHelp();
        $('export-dialog').close();
        syncImageCommands();
    }
    /* 0990 / SMALL PUBLIC API FOR LOCAL INTEGRATIONS AND REGRESSION TESTS. */
    window.RVEApp = Object.freeze({
        getState: function ()
        {
            return ({ version: version, applied: applied, ready: !!base && !isLoading && applied === version && !renderError,
                parameters: { ...params }, seed: seed, resolution: resolution, width: base?.width || 0, height: base?.height || 0,
                worker: processor.mode, language: lang, compare: compare, original: original, zoom: zoom, panX: panX, panY: panY, activeTab: activeTab, exporting: exporting });
        },
        clearSession: clearSession,
        refreshLayout: function ()
        {
            if (autoFit)
                requestAnimationFrame(fit);
        },
        text: function (key)
        {
            return t(key);
        }
    });
    applyLanguage();
    syncImageCommands();
})();

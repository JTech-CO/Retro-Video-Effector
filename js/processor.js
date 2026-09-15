/* ========================================================================
 * RETRO VIDEO EFFECTOR                          DESKTOP EDITION / REV. 2.0
 * FILE    : PROCESSOR.JS
 * MODULE  : PIXEL COPROCESSOR
 * PURPOSE : BACKGROUND WORKER / RECOVERY / READ-ONLY INPUT CACHE
 * REM     : VINTAGE SOURCE STYLE. MODERN BROWSER SERVICES REMAIN IN USE.
 * ======================================================================== */
function RVEProcessor()
{
    var owner = this;
    this.pending = new Map();
    this.serial = 0;
    this.mode = 'Worker';
    this.worker = null;
    this.engine = createRVEEngine();
    /* 0100 / COPY THE SELF-CONTAINED KERNEL TO A MEMORY-RESIDENT WORKER. */
    var workerProgram = [
        '"use strict";',
        'var engine = (' + createRVEEngine.toString() + ')();',
        'self.onmessage = function (event) {',
        '    var message = event.data;',
        '    try {',
        '        var result = engine.process(new Uint8ClampedArray(message.buffer),',
        '            message.width, message.height, message.options, message.seed);',
        '        self.postMessage({ id:message.id, buffer:result.data.buffer,',
        '            milliseconds:result.milliseconds }, [result.data.buffer]);',
        '    } catch (error) {',
        '        self.postMessage({ id:message.id, error:String(error.message || error) });',
        '    }',
        '};'
    ].join('\n');
    try
    {
        var url = URL.createObjectURL(new Blob([workerProgram], { type: 'text/javascript' }));
        try
        {
            this.worker = new Worker(url);
        }
        finally
        {
            URL.revokeObjectURL(url);
        }
        this.worker.onmessage = function (event)
        {
            var reply = event.data;
            var task = owner.pending.get(reply.id);
            if (!task)
                return;
            clearTimeout(task.timer);
            owner.pending.delete(reply.id);
            if (reply.error)
                task.reject(new Error(reply.error));
            else
                task.resolve({ data: new Uint8ClampedArray(reply.buffer), milliseconds: reply.milliseconds });
        };
        this.worker.onerror = function (event)
        {
            event.preventDefault();
            owner.disableWorker(new Error(event.message || 'Worker unavailable'));
        };
    }
    catch (error)
    {
        this.worker = null;
        this.mode = 'Main thread';
    }
}
/* 0200 / RECOVER FROM A FAILED COPROCESSOR WITHOUT LOSING SOURCE PIXELS. */
RVEProcessor.prototype.disableWorker = function (error)
{
    if (this.worker)
        this.worker.terminate();
    this.worker = null;
    this.mode = 'Main thread';
    this.pending.forEach(function (task)
    {
        clearTimeout(task.timer);
        task.reject(error);
    });
    this.pending.clear();
};
RVEProcessor.prototype.runLocal = function (pixels, width, height, options, seed)
{
    var engine = this.engine;
    return new Promise(function (resolve, reject)
    {
        setTimeout(function ()
        {
            try
            {
                resolve(engine.process(pixels, width, height, options, seed));
            }
            catch (error)
            {
                reject(error);
            }
        }, 0);
    });
};
/* 0300 / TRANSFER A COPY. THE INPUT CACHE REMAINS OWNED BY THE MAIN PROGRAM. */
RVEProcessor.prototype.run = function (pixels, width, height, options, seed)
{
    var owner = this;
    if (!owner.worker)
        return owner.runLocal(pixels, width, height, options, seed);
    var id = ++owner.serial;
    var buffer = pixels.slice().buffer;
    return new Promise(function (resolve, reject)
    {
        var timer = setTimeout(function ()
        {
            owner.disableWorker(new Error('Worker timed out'));
        }, 30000);
        owner.pending.set(id, { resolve: resolve, reject: reject, timer: timer });
        try
        {
            owner.worker.postMessage({ id: id, buffer: buffer, width: width, height: height, options: options, seed: seed }, [buffer]);
        }
        catch (error)
        {
            owner.disableWorker(error);
        }
    }).catch(function (error)
    {
        if (owner.worker)
            throw error;
        return owner.runLocal(pixels, width, height, options, seed);
    });
};
RVEProcessor.prototype.destroy = function ()
{
    this.disableWorker(new Error('Processor disposed'));
};
/* EOF / RETURN TO CALLER */

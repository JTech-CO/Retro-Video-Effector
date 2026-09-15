const test = require('node:test');
const assert = require('node:assert/strict');
const {createRVEEngine} = require('../js/engine.js');
const P = require('../js/parameters.js');
const E = createRVEEngine();
const w=320,h=180;
function fixture(width=w,height=h) {
  const a=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const k=(y*width+x)*4;
    a[k]=(x*7+y*2)%256;a[k+1]=(x*3+y*9)%256;a[k+2]=(x*11+y*5)%256;a[k+3]=255;
  }
  return a;
}
const image=fixture();
const run=(p={},s=1994)=>E.process(image,w,h,P.normalize({...P.defaults,...p}),s).data;
test('Exactly 30 controls: 25 numeric and 5 boolean',()=>{
 assert.equal(P.definitions.length,30);assert.equal(P.definitions.filter(x=>x.type==='range').length,25);
 assert.equal(P.definitions.filter(x=>x.type==='checkbox').length,5);
});
test('All defaults are in range and normalized without changes',()=>{
 assert.deepEqual(P.normalize(P.defaults),P.defaults);
 for(const d of P.definitions.filter(x=>x.type==='range')) assert.ok(d.default>=d.min&&d.default<=d.max);
});
test('Invalid and hostile settings are bounded and unknown keys ignored',()=>{
 const p=P.normalize(JSON.parse('{"tone_low":99999,"jpeg_quality":-100,"noise_intensity_y":"NaN","apply_jpeg":"false","__proto__":{"polluted":true}}'));
 assert.equal(p.tone_low,50);assert.equal(p.jpeg_quality,1);assert.equal(p.noise_intensity_y,.02);assert.equal(p.apply_jpeg,true);assert.equal({}.polluted,undefined);assert.equal(Object.keys(p).length,30);
 assert.deepEqual(P.normalize(null),P.defaults);assert.deepEqual(P.normalize([]),P.defaults);
});
test('Seeded processor is deterministic',()=>assert.deepEqual(run(),run()));
test('Changing the seed changes active artifacts',()=>assert.notDeepEqual(run({},1994),run({},1995)));
test('Input buffer is never mutated',()=>{const before=image.slice();run();assert.deepEqual(image,before);});
test('Output dimensions, RGBA length and alpha preserved by the kernel',()=>{
 const input=fixture(31,17);for(let i=3;i<input.length;i+=4)input[i]=i%256;
 const r=E.process(input,31,17,P.defaults);assert.equal(r.data.length,input.length);assert.equal(r.width,31);assert.equal(r.height,17);
 for(let i=3;i<input.length;i+=4)assert.equal(r.data[i],input[i]);
});
test('Single-pixel and single-row/column images are finite and safe',()=>{
 for(const [x,y]of [[1,1],[1,31],[31,1],[2,2]]){const r=E.process(fixture(x,y),x,y,P.defaults);assert.equal(r.data.length,x*y*4);assert.ok([...r.data].every(Number.isFinite));}
});
test('Reject malformed dimensions and buffers',()=>{
 for(const [x,y]of [[0,1],[1,-1],[3000,1],[2560,2560],[2.5,3]])assert.throws(()=>E.process(new Uint8ClampedArray(4),x,y,P.defaults));
 assert.throws(()=>E.process(new Uint8ClampedArray(3),1,1,P.defaults));
 assert.throws(()=>E.process(new Uint8ClampedArray(4),1,1,{...P.defaults,tone_high:0,tone_low:10}));
});
test('Flat RGB remains stable in the neutral linear path (within 1 level)',()=>{
 const a=new Uint8ClampedArray(80*40*4);for(let i=0;i<a.length;i+=4)a.set([70,140,210,255],i);
 const p={...P.defaults,apply_color_cast:false,apply_strong_ringing:false,tone_low:0,tone_high:255,noise_intensity_y:0,noise_intensity_c:0,jitter_amp:0,head_switch_rows:0,dropout_count:0,apply_scanlines:false};
 const r=E.process(a,80,40,p).data;for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-r[i])<=1);
});
test('Disabled artifact pipeline is independent of the noise seed',()=>{
 const p={noise_intensity_y:0,noise_intensity_c:0,jitter_amp:0,head_switch_rows:0,dropout_count:0};assert.deepEqual(run(p,1),run(p,2));
});
test('Disabled ringing ignores amount and radius',()=>assert.deepEqual(run({apply_strong_ringing:false,sharpen_amount:0,sharpen_size:1}),run({apply_strong_ringing:false,sharpen_amount:10,sharpen_size:5})));
test('Disabled color cast ignores all channel gains',()=>assert.deepEqual(run({apply_color_cast:false,cast_r:.8,cast_g:.8,cast_b:.8}),run({apply_color_cast:false,cast_r:1.2,cast_g:1.2,cast_b:1.2})));
test('Disabled scanlines ignore scanline weight',()=>assert.deepEqual(run({apply_scanlines:false,scanline_weight:.5}),run({apply_scanlines:false,scanline_weight:1})));
// JPEG is a native browser codec stage and is covered by browser.test.py, not this kernel.
for(const d of P.definitions.filter(x=>!['apply_jpeg','jpeg_quality'].includes(x.key))) {
 test('Control changes pixels: '+d.key,()=>{
  const context=d.parent?{[d.parent]:true}:{};
  const baseline=run(context);
  const changed=d.type==='checkbox'?!d.default:(d.default!==d.max?d.max:d.min);
  assert.notDeepEqual(run({...context,[d.key]:changed}),baseline);
 });
}
test('All numeric extremes remain bounded',()=>{
 const p={...P.defaults};for(const d of P.definitions) p[d.key]=d.type==='range'?d.max:true;
 const r=run(p);assert.ok(r.some(v=>v!==0));assert.equal(r.length,w*h*4);
});

/* 0800 / THE SHELL REWRITE MUST NOT CHANGE THE PREVIOUS PIXEL KERNEL. */
const crypto = require('node:crypto');
const baselines = require('./pixel-baselines.json');
for (const baseline of baselines) {
 test('Previous release pixel parity: '+baseline.preset, function () {
  const result=E.process(fixture(baseline.width,baseline.height),baseline.width,baseline.height,P.normalize(P.presets[baseline.preset]),baseline.seed);
  assert.equal(crypto.createHash('sha256').update(result.data).digest('hex'),baseline.sha256);
 });
}

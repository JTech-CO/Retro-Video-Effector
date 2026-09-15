"""RVE 2.1 / UI, LOCALIZATION, REAL CANVAS, WORKER AND DOWNLOAD REGRESSION.
HTTP/file navigation is attempted first. If an administrator blocks it, the
suite reports that fact and uses a test-only in-memory copy, never browser
policy changes. Only that copy permits inline scripts. Runtime CSP is intact.
"""
from pathlib import Path
from html.parser import HTMLParser
import functools, http.server, io, json, os, re, threading, time, urllib.request
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output'
OUT.mkdir(exist_ok=True)
REPORT = {'version':'2.1.0','results':[], 'errors':[], 'navigation':{}, 'notes':[], 'browser_mode':'unknown'}
HTML = (ROOT/'index.html').read_text(encoding='utf-8')
SCRIPTS = re.findall(r'<script\b[^>]*src="\./([^"]+)"[^>]*></script>',HTML)
STYLES = re.findall(r'<link\b[^>]*href="\./(css/[^"]+)"[^>]*>',HTML)

def check(name, ok, detail=None):
    REPORT['results'].append({'name':name,'pass':bool(ok),'detail':detail})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)

def wait(page,predicate,timeout=15):
    until=time.monotonic()+timeout
    while time.monotonic()<until:
        if page.evaluate(predicate):return
        time.sleep(.04)
    raise RuntimeError('Timeout: '+predicate+' / '+repr(page.evaluate('window.RVEApp && RVEApp.getState()')))

def ready(page):wait(page,'window.RVEApp && RVEApp.getState().ready')
def state(page):return page.evaluate('RVEApp.getState()')
def inp(page,selector,value,event='input'):
    page.locator(selector).evaluate('(el,a)=>{el.value=a.v;el.dispatchEvent(new Event(a.e,{bubbles:true}));}',{'v':str(value),'e':event})
def pixels(page):return page.evaluate("document.getElementById('main-canvas').toDataURL()")
def fixture(w=320,h=180):
    image=Image.new('RGB',(w,h));image.putdata([((x*7+y*2)%256,(x*3+y*9)%256,(x*11+y*5)%256) for y in range(h) for x in range(w)])
    b=io.BytesIO();image.save(b,'PNG');return b.getvalue()
DATA=fixture()
def load_image(page,name='sample-frame.png',data=DATA):
    page.locator('#file-upload').set_input_files({'name':name,'mimeType':'image/png','buffer':data});ready(page)
def save(page,name,fmt='image/png'):
    page.click('#btn-export');page.select_option('#export-format',fmt)
    with page.expect_download(timeout=20000) as download:page.click('#btn-download')
    path=OUT/name;download.value.save_as(str(path));return path,download.value.suggested_filename

def memory(page,prelude=''):
    text=re.sub(r'<script\b[^>]*src="\./[^"]+"[^>]*></script>','',HTML)
    text=re.sub(r'<link\b[^>]*href="\./(css/[^"]+)"[^>]*>',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',text)
    text=re.sub(r'<link\b[^>]*rel="icon"[^>]*>','',text)
    text=text.replace("script-src 'self';","script-src 'self' 'unsafe-inline';")
    code=('<script>'+prelude+'</script>' if prelude else '')+''.join('<script>'+(ROOT/p).read_text()+'</script>' for p in SCRIPTS)
    page.set_content(text.replace('</body>',code+'</body>'),wait_until='load')
    wait(page,'typeof RVEApp === "object"')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
SERVER=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT.parent)))
threading.Thread(target=SERVER.serve_forever,daemon=True).start()
URL='http://127.0.0.1:'+str(SERVER.server_port)+'/'+ROOT.name+'/'

def mount(page,prelude=''):
    if REPORT['browser_mode']=='http':
        if prelude:page.add_init_script(prelude)
        page.goto(URL);wait(page,'typeof RVEApp === "object"')
    else:memory(page,prelude)

def capture(page,name,full=False):
    if page.locator('#toast').is_visible():wait(page,"document.getElementById('toast').hidden",8)
    page.screenshot(path=str(OUT/name),full_page=full)

try:
    assets=['index.html','.nojekyll','assets/favicon.svg']+STYLES+SCRIPTS
    responses=[]
    for asset in assets:
        with urllib.request.urlopen(URL+asset) as r:
            responses.append({'path':asset,'status':r.status,'identical':r.read()==(ROOT/asset).read_bytes(),'mime':r.headers.get_content_type()})
    check('Static HTTP: all runtime resources load under a repository subpath',all(x['status']==200 and x['identical'] for x in responses),responses)
    with sync_playwright() as p:
        launch={'headless':True}
        exe=os.environ.get('RVE_CHROMIUM','/usr/bin/chromium')
        if Path(exe).exists():launch['executable_path']=exe
        b=p.chromium.launch(**launch);REPORT['browser_version']=b.version
        context=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        probe=context.new_page()
        for scheme,url in [('file',(ROOT/'index.html').as_uri()),('http',URL)]:
            try:
                probe.goto(url,timeout=7000,wait_until='load');wait(probe,'typeof RVEApp === "object"',5)
                REPORT['navigation'][scheme]='passed'
            except Exception as e:REPORT['navigation'][scheme]=str(e).split('Call log')[0].strip()
        REPORT['browser_mode']='http' if REPORT['navigation']['http']=='passed' else 'in-memory; test-only inline-script CSP'
        probe.close();page=context.new_page();page.set_default_timeout(10000)
        page.on('pageerror',lambda e:REPORT['errors'].append(str(e)))
        requests=[];page.on('request',lambda r:requests.append({'url':r.url,'method':r.method}))
        mount(page)
        check('App-only root fills the viewport without desktop/frame/taskbar controls',page.evaluate("document.querySelectorAll('.desktop-icons,.desktop-heading,.taskbar,[data-shell],.resize-grip,.app-header .titlebar-btn').length===0 && document.getElementById('app-window').getBoundingClientRect().x===0 && document.getElementById('app-window').getBoundingClientRect().width===innerWidth"))
        check('Windows 95 navy and silver remain within the app',page.evaluate("getComputedStyle(document.body).backgroundColor==='rgb(224, 224, 224)' && getComputedStyle(document.querySelector('.app-header')).backgroundColor==='rgb(0, 0, 128)'"))
        check('Exactly 30 effect controls and four fixed tabs',page.locator('.param-input').count()==30 and page.locator('[role=tab]').count()==4)
        check('Empty image-only actions disabled, not clickable no-ops',all(page.locator('#'+x).is_disabled() for x in ['btn-export','btn-compare','btn-fit','btn-zoom-in','btn-zoom-out','zoom-slider']))
        check('Unavailable native file sharing is hidden',page.locator('#btn-share').is_hidden())
        check('No placeholder hyperlinks or duplicate OS menus',page.locator('a[href=""],a[href="#"],a[href^="javascript:"],.menu,#btn-menu').count()==0)
        for selector in ['#btn-upload-trigger','#btn-drop-upload']:
            with page.expect_file_chooser() as chooser:page.click(selector)
            check('Image picker really opens: '+selector,not chooser.value.is_multiple())
        with page.expect_file_chooser() as chooser:page.click('#btn-settings-load')
        check('Settings picker really opens',not chooser.value.is_multiple())
        capture(page,'app-empty-kr.png')
        page.click('#btn-demo');ready(page)
        check('Test pattern produces real pixels through a Blob Worker',state(page)['width']==1200 and state(page)['height']==900 and state(page)['worker']=='Worker')
        page.click('#property-tab-2')
        bounds=page.evaluate("['preview-viewport','control-panel'].map(id=>{let r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})")
        check('Preview and properties do not overlap on desktop',bounds[0]['right']<bounds[1]['left'],bounds)
        capture(page,'app-desktop-kr.png')
        # Text, tooltips, tab state and pixels survive direct language selection.
        before=state(page);image=pixels(page);page.click('#lang-en')
        check('EN selects English immediately and sets aria-pressed state',state(page)['language']=='en' and page.locator('#lang-en').get_attribute('aria-pressed')=='true' and page.locator('html').get_attribute('lang')=='en')
        check('Language change preserves parameters, pixels, zoom, and selected tab',state(page)['parameters']==before['parameters'] and state(page)['activeTab']==2 and pixels(page)==image and state(page)['zoom']==before['zoom'])
        check('EN labels and export choices are translated',page.locator('#btn-upload-trigger').inner_text().strip()=='Open image' and page.locator('#export-format option').first.inner_text()=='PNG / Lossless')
        capture(page,'app-desktop-en.png')
        page.click('#lang-kr');check('KR selects Korean directly, not a three-language cycle',state(page)['language']=='ko' and page.locator('#lang-kr').get_attribute('aria-pressed')=='true' and page.locator('[data-language]').count()==2)
        check('Both dictionaries have complete matching keys',page.evaluate("JSON.stringify(Object.keys(RVEText.en).sort())===JSON.stringify(Object.keys(RVEText.ko).sort())"))
        check('Every declarative text/ARIA/tooltip/meta key exists in both languages',page.evaluate("Array.from(document.querySelectorAll('[data-i18n],[data-tip],[data-aria],[data-meta]')).every(e=>['i18n','tip','aria','meta'].every(k=>!e.dataset[k] || ['en','ko'].every(l=>typeof RVEText[l][e.dataset[k]]==='string')))"))
        check('All 30 effect labels and help texts available in English and Korean',page.evaluate("RVEParameters.definitions.every(p=>['ko','en'].every(l=>p.label[l] && p.help[l]))"))
        # Rendered fonts, not a downloaded font asset.
        cdp=context.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable')
        doc=cdp.send('DOM.getDocument');node=cdp.send('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':'#btn-upload-trigger span'})
        fonts=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']})['fonts']
        check('Korean label renders with an installed font and real glyphs',bool(fonts) and sum(x['glyphCount'] for x in fonts)>0,fonts)
        check('UTF-8 UI text has no replacement characters',not '\ufffd' in page.locator('body').inner_text())
        sizes=page.evaluate("Array.from(document.querySelectorAll('button,label,output,p,select,h1,h2,h3,legend,.status-cell')).filter(e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden').map(e=>parseFloat(getComputedStyle(e).fontSize))")
        check('Visible editor text is at least 14px on desktop',min(sizes)>=14,{'minimum':min(sizes)})
        page.focus('#property-tab-2');page.keyboard.press('ArrowRight');page.keyboard.press('Home')
        check('Arrow/Home tab navigation is functional',state(page)['activeTab']==0 and page.locator('#property-tab-0').get_attribute('aria-selected')=='true')
        # Every parameter input and every contextual ? button gets exercised.
        definitions=page.evaluate('RVEParameters.definitions')
        for control in definitions:
            page.click('#property-tab-'+str(control['group']))
            if control.get('parent'):page.locator('#p_'+control['parent']).set_checked(True)
            if control['type']=='checkbox':
                value=not state(page)['parameters'][control['key']];page.locator('#p_'+control['key']).set_checked(value)
            else:
                value=control['max'] if state(page)['parameters'][control['key']]!=control['max'] else control['min'];inp(page,'#p_'+control['key'],value)
            check('Effect input: '+control['key'],state(page)['parameters'][control['key']]==value)
            helper=page.locator('[data-help="'+control['key']+'"]');helper.click()
            check('Context help: '+control['key'],page.locator('#info-popup').is_visible() and page.locator('#info-popup').inner_text()==control['help']['ko'] and helper.get_attribute('aria-describedby')=='info-popup')
            helper.click()
        ready(page)
        page.click('#btn-reset');ready(page)
        check('Reset restores all effect values and seed',state(page)['parameters']==page.evaluate('RVEParameters.defaults') and state(page)['seed']==1994)
        page.click('#lang-en')
        check('A visible status message also translates when language changes',page.locator('#toast').inner_text()=='Effects and seed reset to defaults.')
        page.click('#property-tab-0');page.locator('#p_apply_jpeg').uncheck();ready(page)
        check('Disabled parent disables dependent JPEG input',page.locator('#p_jpeg_quality').is_disabled())
        page.locator('#p_apply_jpeg').check();ready(page)
        page.locator('[data-help=jpeg_quality]').click();page.keyboard.press('Escape')
        check('Escape closes contextual help',page.locator('#info-popup').is_hidden())
        # User image, Unicode filename and language state are preserved.
        load_image(page,'한글-image.png')
        image=pixels(page);before=state(page);page.click('#lang-kr')
        check('Unicode filename remains intact after EN/KR switching',page.locator('#file-name').inner_text()=='한글-image.png' and image==pixels(page) and state(page)['version']==before['version'])
        for preset in ['standard','soft','worn','crt']:
            page.select_option('#preset-select',preset);ready(page)
            check('Preset applies a complete parameter record: '+preset,state(page)['parameters']==page.evaluate('RVEParameters.normalize(RVEParameters.presets["'+preset+'"])'))
        page.click('#btn-reset');ready(page)
        inp(page,'#seed-input',3001,'change');ready(page)
        check('Numeric noise seed sets deterministic state',state(page)['seed']==3001)
        old=state(page)['seed'];page.click('#btn-reseed');ready(page)
        check('New-noise button changes seed',state(page)['seed']!=old)
        page.click('#btn-reset');ready(page)
        png,name=save(page,'processed.png')
        check('PNG download is an actual file with Unicode name and source dimensions',name=='한글-image-retro.png' and Image.open(png).size==(320,180) and Image.open(png).format=='PNG')
        page.click('#btn-compare');inp(page,'#compare-slider',72)
        check('Split comparison changes state and pixels',state(page)['compare'] and pixels(page)!=image)
        page.click('#btn-original')
        check('Original button is a real pressed toggle',state(page)['original'] and page.locator('#btn-original').get_attribute('aria-pressed')=='true')
        png2,_=save(page,'ui-not-exported.png')
        check('Saved image never includes compare divider or original-view override',png.read_bytes()==png2.read_bytes())
        page.click('#btn-original');page.click('#btn-compare')
        jpg,name=save(page,'processed.jpg','image/jpeg')
        check('JPEG download really decodes as JPEG',Image.open(jpg).format=='JPEG' and Image.open(jpg).size==(320,180))
        page.click('#btn-export');page.select_option('#export-format','image/jpeg');inp(page,'#export-quality',72)
        check('Export quality slider is wired and JPEG-only',page.locator('#export-quality-value').inner_text()=='72' and page.locator('#export-quality-group').is_visible())
        page.locator('#export-dialog [data-i18n=cancel]').click()
        check('Cancel closes export dialog',page.locator('#export-dialog').is_hidden())
        page.click('#btn-export');page.locator('#export-dialog .titlebar-btn').click()
        check('Export close button closes its actual dialog',page.locator('#export-dialog').is_hidden())
        page.click('#property-tab-0')
        for n in range(12):inp(page,'#p_tone_low',n+15)
        ready(page);check('Rapid slider updates commit the latest value only',state(page)['parameters']['tone_low']==26 and state(page)['version']==state(page)['applied'])
        inp(page,'#p_tone_low',29);new,_=save(page,'latest.png')
        check('Save waits for the latest requested filter result',state(page)['parameters']['tone_low']==29 and state(page)['ready'] and new.stat().st_size>100)
        with page.expect_download() as dl:page.click('#btn-settings-save')
        path=OUT/'settings.json';dl.value.save_as(str(path));saved=json.loads(path.read_text())
        check('Settings export downloads usable JSON',saved['schema']=='retro-video-effector/settings' and dl.value.suggested_filename=='Retro-Video-Effector-settings.json')
        page.click('#btn-reset');ready(page)
        page.locator('#settings-upload').set_input_files(str(path));ready(page)
        check('Settings import restores exported effect values',state(page)['parameters']['tone_low']==29)
        legacy=dict(saved,schema='vhs-local-clone/settings',version=1,seed=1234)
        page.locator('#settings-upload').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':json.dumps(legacy).encode()});ready(page)
        check('Version-1 settings remain readable',state(page)['seed']==1234)
        page.locator('#settings-upload').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{broken'})
        wait(page,"document.getElementById('toast').classList.contains('error')")
        check('Bad settings show error without losing existing image',state(page)['ready'] and state(page)['seed']==1234)
        page.locator('#file-upload').set_input_files({'name':'bad.svg','mimeType':'image/svg+xml','buffer':b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'})
        wait(page,"document.body.dataset.state==='ready'")
        check('Unsupported input is rejected without breaking the editor',state(page)['width']==320 and page.locator('#toast').is_visible())
        # All view buttons and their keyboard alternatives.
        page.click('#btn-fit');z=state(page)['zoom'];page.click('#btn-zoom-in');z2=state(page)['zoom'];page.click('#btn-zoom-out')
        check('Zoom in/out/fit work',z2>z and abs(state(page)['zoom']-z)<.001)
        inp(page,'#zoom-slider',160);check('Zoom range sets actual scale',state(page)['zoom']==1.6)
        page.focus('#preview-viewport');page.keyboard.press('f');check('F restores fitted view',state(page)['zoom']<=1)
        page.keyboard.press('c');check('C toggles comparison',state(page)['compare']);page.keyboard.press('c')
        page.keyboard.down('Space');pressed=page.locator('#btn-original').get_attribute('aria-pressed')=='true';page.keyboard.up('Space')
        check('Space shows and releases original view',pressed and page.locator('#btn-original').get_attribute('aria-pressed')=='false')
        with page.expect_file_chooser():page.keyboard.press('Control+o')
        check('Ctrl+O opens native file picker',True)
        page.keyboard.press('Control+s');check('Ctrl+S opens actual export dialog',page.locator('#export-dialog').is_visible());page.keyboard.press('Escape')
        page.click('#btn-info');check('Help button opens real help content',page.locator('#info-dialog').is_visible())
        page.locator('#info-dialog .titlebar-btn').click();check('Help close button works',page.locator('#info-dialog').is_hidden())
        page.click('#btn-info');page.locator('#info-dialog [data-i18n=ok]').click();check('Help OK button works',page.locator('#info-dialog').is_hidden())
        page.focus('#preview-viewport');page.keyboard.press('F1');check('F1 opens help',page.locator('#info-dialog').is_visible());page.keyboard.press('Escape')
        check('Escape closes real modal',page.locator('#info-dialog').is_hidden())
        # Resolution paths use the current image buffer, not a fake select.
        page.click('#btn-demo');ready(page)
        page.select_option('#resolution-select','720');ready(page)
        check('720px resolution selection resizes output',state(page)['width']==720 and state(page)['height']==540)
        page.select_option('#resolution-select','1440');ready(page)
        check('1440px resolution selection never upscales input',state(page)['width']==1200)
        page.select_option('#resolution-select','native');ready(page)
        # Responsive UI and type; all sections stay in normal flow.
        for width,height in [(1920,1080),(1440,900),(1024,768),(920,800),(768,1024),(390,844),(320,640)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(120)
            layout=page.evaluate("({scroll:document.documentElement.scrollWidth,inner:innerWidth,position:getComputedStyle(document.getElementById('control-panel')).position,transform:getComputedStyle(document.getElementById('control-panel')).transform,minimum:Math.min(...Array.from(document.querySelectorAll('button,label,p,output,select,h1,h2,h3,legend')).filter(e=>e.getClientRects().length).map(e=>parseFloat(getComputedStyle(e).fontSize)))})")
            check('Responsive '+str(width)+'px: no horizontal overflow, drawers, or tiny type',layout['scroll']<=width and layout['transform']=='none' and layout['position'] not in ['fixed','absolute'] and layout['minimum']>=14,layout)
        page.set_viewport_size({'width':390,'height':844});page.click('#property-tab-3')
        page.locator('#p_apply_scanlines').check();ready(page)
        check('Bottom tape controls remain reachable on mobile',state(page)['parameters']['apply_scanlines'])
        for direction in ['left','right','up','down']:
            before=state(page);page.locator('[data-dir='+direction+']').click();after=state(page)
            check('Pan button works: '+direction,before['panX']!=after['panX'] or before['panY']!=after['panY'])
        page.click('#btn-reset');ready(page);page.click('#property-tab-2');page.click('#btn-fit')
        page.evaluate('window.scrollTo(0,0)');capture(page,'app-mobile-kr.png')
        page.evaluate("window.scrollTo(0,document.getElementById('control-panel').getBoundingClientRect().top+scrollY)");capture(page,'app-mobile-properties-kr.png')
        page.click('#lang-en');page.evaluate('window.scrollTo(0,0)');capture(page,'app-mobile-en.png')
        # Storage state is explicitly simulated only when about:blank blocks real storage.
        store="Object.defineProperty(window,'localStorage',{value:{getItem:function(){return 'en';},setItem:function(k,v){window.savedLanguage=[k,v];}}});"
        q=context.new_page();mount(q,store)
        check('Stored-language startup logic (injected storage unit check)',state(q)['language']=='en');q.click('#lang-kr')
        check('Language storage write (injected storage unit check)',q.evaluate('savedLanguage')==['rve-language','ko']);q.close()
        q=context.new_page();mount(q,"Object.defineProperty(window,'localStorage',{get:function(){throw new Error('Storage blocked');}});");q.click('#lang-en')
        check('Language switching still works when storage is denied',state(q)['language']=='en');q.close()
        q=context.new_page();mount(q,"window.Worker=function(){throw new Error('Test worker unavailable');};");load_image(q)
        check('Real main-thread processing fallback still works',state(q)['worker']=='Main thread' and state(q)['ready']);q.close()
        # The native share destination cannot be driven in this environment.
        mock="Object.defineProperty(navigator,'canShare',{value:function(){return true;}});Object.defineProperty(navigator,'share',{value:async function(a){window.shareResult={type:a.files[0].type,size:a.files[0].size,name:a.files[0].name};}});"
        q=context.new_page();mount(q,mock);load_image(q);q.click('#btn-share');wait(q,'!!window.shareResult')
        share=q.evaluate('shareResult');check('Supported file-share branch sends a real PNG File (mock OS receiver)',share['type']=='image/png' and share['size']>100 and share['name'].endswith('-retro.png'),share);q.close()
        # Clipboard and drop use synthetic input events but the actual decoder/engine.
        for kind in ['paste','drop']:
            page.evaluate("""async (kind)=>{const c=document.createElement('canvas');c.width=37;c.height=29;c.getContext('2d').fillRect(0,0,37,29);const blob=await new Promise(r=>c.toBlob(r));const d=new DataTransfer();d.items.add(new File([blob],kind+'.png',{type:'image/png'}));if(kind==='paste'){document.body.focus();document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true}));}else{window.dispatchEvent(new DragEvent('drop',{dataTransfer:d,bubbles:true}));}}""",kind)
            ready(page);check('Local '+kind+' event decodes and processes its image',state(page)['width']==37 and state(page)['height']==29)
        check('No application JavaScript exceptions',not REPORT['errors'],REPORT['errors'])
        check('No image uploads or third-party runtime requests',not [r for r in requests if r['method']!='GET' or (r['url'].startswith('http') and not r['url'].startswith(URL))],requests)
        REPORT['notes'].append('OS share destination was mocked; no claim of native share-sheet delivery. Paste/drop input events were synthetic; actual image decode and processing executed.')
        if REPORT['browser_mode']!='http':REPORT['notes'].append('HTTP/file navigation was blocked by the browser administrator. UI, fonts, Canvas, Blob Worker, actual downloads and JSON ran in an in-memory test copy. Static HTTP bytes were independently checked. Native storage persistence across navigation and final GitHub Pages deployment were not tested.')
        REPORT['notes'].append('Only Chromium and simulated viewport sizes were tested; not Safari/Firefox or physical mobile devices. No font files are distributed.')
        b.close()
except Exception as e:
    REPORT['fatal']=str(e);raise
finally:
    SERVER.shutdown()
    REPORT['passed']=sum(x['pass'] for x in REPORT['results']);REPORT['failed']=sum(not x['pass'] for x in REPORT['results'])
    (OUT/'browser-results.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+'\n')
    print('RESULT',REPORT['passed'],'passed,',REPORT['failed'],'failed',flush=True)
if REPORT['failed']:raise SystemExit(1)

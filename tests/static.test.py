"""RVE / STATIC RELEASE AUDIT. Standard library only; no runtime dependency."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, unittest

ROOT=Path(__file__).resolve().parents[1]
class EntryParser(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.references=[];self.scripts=[];self.tags=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs);self.tags.append((tag,data))
        if 'id' in data:self.ids.append(data['id'])
        if tag=='script':self.scripts.append(data)
        for key in ('src','href'):
            if key in data and not data[key].startswith('#'):
                self.references.append(data[key])

HTML=(ROOT/'index.html').read_text();PARSER=EntryParser();PARSER.feed(HTML)
JS='\n'.join(p.read_text() for p in (ROOT/'js').glob('*.js'))
CSS=(ROOT/'css/app.css').read_text()

class StaticRelease(unittest.TestCase):
    def test_01_root_entry_and_nojekyll(self):
        self.assertTrue((ROOT/'index.html').is_file());self.assertEqual((ROOT/'.nojekyll').read_bytes(),b'')
    def test_02_css_and_js_are_separate_folders(self):
        self.assertTrue((ROOT/'css/windows95.css').is_file());self.assertTrue((ROOT/'css/app.css').is_file());self.assertEqual(len(list((ROOT/'js').glob('*.js'))),6)
    def test_03_asset_references_are_relative_and_exist(self):
        for value in PARSER.references:
            self.assertTrue(value.startswith('./'),value)
            self.assertTrue((ROOT/unquote(urlsplit(value).path)).is_file(),value)
    def test_04_no_duplicate_dom_ids(self):
        self.assertEqual(len(PARSER.ids),len(set(PARSER.ids)))
    def test_05_external_classic_scripts_in_dependency_order(self):
        expected=['parameters','strings','engine','processor','demo','app']
        self.assertEqual([Path(tag['src']).stem for tag in PARSER.scripts],expected)
        for tag in PARSER.scripts:self.assertIn('defer',tag);self.assertNotEqual(tag.get('type'),'module')
    def test_06_no_inline_javascript_or_event_handlers(self):
        self.assertFalse([content for content in re.findall(r'<script\b[^>]*>(.*?)</script>',HTML,re.I|re.S) if content.strip()])
        self.assertFalse([(tag,key) for tag,data in PARSER.tags for key in data if key.lower().startswith('on')])
    def test_07_strict_runtime_csp(self):
        csp=next(data['content'] for tag,data in PARSER.tags if tag=='meta' and data.get('http-equiv')=='Content-Security-Policy')
        self.assertIn("script-src 'self';",csp);self.assertIn("connect-src 'none'",csp);self.assertIn('worker-src blob:',csp);self.assertNotIn('unsafe-eval',csp)
    def test_08_no_runtime_network_endpoints(self):
        self.assertIsNone(re.search(r'https?://',JS))
        self.assertIsNone(re.search(r'\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(',JS))
    def test_09_no_eval_document_write_or_activex(self):
        self.assertIsNone(re.search(r'\beval\s*\(|document\.write\s*\(|new\s+ActiveXObject',JS))
    def test_10_no_external_css_fonts_or_imports(self):
        styles='\n'.join(p.read_text() for p in (ROOT/'css').glob('*.css'))
        self.assertNotIn('@font-face',styles);self.assertNotIn('@import',styles);self.assertNotIn('https://',styles)
    def test_11_no_font_binaries(self):
        self.assertFalse([str(p) for p in ROOT.rglob('*') if p.suffix.lower() in ('.ttf','.otf','.woff','.woff2')])
    def test_12_no_former_brand_in_runtime(self):
        self.assertIsNone(re.search(r'HEISEI|LOCAL CLONE',HTML+JS,re.I))
    def test_13_no_legacy_drawer_selectors(self):
        self.assertNotIn('sidebar-panel',HTML+CSS);self.assertNotIn('translateX(-100%)',CSS);self.assertNotIn('translateY(100%)',CSS)
    def test_14_vintage_source_headers(self):
        for p in (ROOT/'js').glob('*.js'):
            source=p.read_text();self.assertIn('RETRO VIDEO EFFECTOR',source[:500]);self.assertIn('FILE',source[:500]);self.assertNotIn('=>',source)
    def test_15_brand_schema_export_and_namespace(self):
        app=(ROOT/'js/app.js').read_text()
        self.assertIn('retro-video-effector/settings',app);self.assertIn('vhs-local-clone/settings',app);self.assertIn('RVEApp',app);self.assertIn('-retro.',app)
    def test_16_no_build_required(self):
        package=json.loads((ROOT/'package.json').read_text());self.assertFalse(package.get('dependencies'));self.assertNotIn('build',package['scripts']);self.assertNotIn('serve',package['scripts'])
    def test_17_readme_links_resolve(self):
        for file in [ROOT/'README.md',ROOT/'README-KR.md']+list((ROOT/'docs').glob('*.md')):
            for link in re.findall(r'\]\(([^)]+)\)',file.read_text()):
                if urlsplit(link).scheme or link.startswith('#'):continue
                self.assertTrue((file.parent/unquote(link.split('#')[0])).exists(),str(file)+': '+link)
    def test_18_template_colors_retained(self):
        s=(ROOT/'css/windows95.css').read_text()
        self.assertIn('background: #000;',s);self.assertIn('background: #000080;',s);self.assertIn('background: #e0e0e0;',s)
    def test_19_all_local_menu_targets_exist(self):
        for tag,attrs in PARSER.tags:
            if 'data-command' in attrs:self.assertIn(attrs['data-command'],PARSER.ids)
            if 'data-close' in attrs:self.assertIn(attrs['data-close'],PARSER.ids)
    def test_20_package_identity(self):
        info=json.loads((ROOT/'package.json').read_text());self.assertEqual(info['name'],'retro-video-effector');self.assertEqual(info['version'],'2.1.0')

    def test_21_no_simulated_desktop_in_entry(self):
        self.assertIsNone(re.search(r'class="[^"\n]*(desktop-icons|desktop-heading|taskbar|resize-grip)', HTML))
        self.assertNotIn('data-shell=', HTML)
        self.assertNotIn('id="btn-start"', HTML)
        self.assertNotIn('id="btn-minimize"', HTML)
        self.assertNotIn('id="btn-maximize"', HTML)
        self.assertFalse((ROOT/'js/shell.js').exists())
    def test_22_no_placeholder_anchors(self):
        for tag,attrs in PARSER.tags:
            if tag=='a':
                self.assertTrue(attrs.get('href'))
                self.assertNotEqual(attrs['href'], '#')
                self.assertFalse(attrs['href'].startswith('javascript:'))
    def test_23_direct_language_buttons(self):
        buttons=[a.get('data-language') for t,a in PARSER.tags if 'data-language' in a]
        self.assertEqual(buttons,['en','ko'])
        self.assertNotIn('id="btn-lang"',HTML)
    def test_24_unicode_files_are_clean(self):
        for p in [ROOT/'index.html']+list((ROOT/'js').glob('*.js'))+list((ROOT/'css').glob('*.css')):
            s=p.read_text(encoding='utf-8',errors='strict')
            self.assertNotIn('\ufffd',s,str(p))
    def test_25_no_tiny_type_in_application_overrides(self):
        for size in re.findall(r'font-size:\s*(\d+)px',CSS):self.assertGreaterEqual(int(size),14)
        self.assertIn('"Noto Sans CJK KR"',CSS)
        self.assertIn('"Malgun Gothic"',CSS)
    def test_26_old_ui_event_targets_removed(self):
        app=(ROOT/'js/app.js').read_text()
        self.assertNotIn("$('btn-menu')",app)
        self.assertNotIn("$('btn-lang')",app)
        self.assertNotIn('setInterval',app)
    def test_27_explicit_button_types(self):
        for tag,attrs in PARSER.tags:
            if tag=='button':self.assertEqual(attrs.get('type'),'button')

if __name__=='__main__':unittest.main(verbosity=2)

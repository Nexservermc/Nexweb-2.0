/* ==========================================================
   NEX 官网构建：把 src/ 里的模板 + 公共片段合成静态页
   用法：node build.mjs         （或双击 重新发布.bat）
   改导航/页脚 → 改 src/partials/；改样式 → 改 src/css/site.css
   ========================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SRC = path.join(ROOT, 'src');
const read = (p) => fs.readFileSync(p, 'utf8');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

const partials = {};
for (const f of fs.readdirSync(path.join(SRC, 'partials'))) {
  partials[path.basename(f, '.html')] = read(path.join(SRC, 'partials', f));
}

const css = read(path.join(SRC, 'css', 'site.css'));
const jsFiles = fs.readdirSync(path.join(SRC, 'js'));
const js = jsFiles.map((f) => read(path.join(SRC, 'js', f))).join('\n');
const VER_CSS = hash(css);
const VER_JS = hash(js);

/* 输出静态资源 */
fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'js'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'css', 'site.css'), css);
for (const f of jsFiles) fs.writeFileSync(path.join(ROOT, 'js', f), read(path.join(SRC, 'js', f)));

/* 合成页面 */
const pages = fs.readdirSync(SRC).filter((f) => f.endsWith('.html'));
let count = 0;
for (const page of pages) {
  let html = read(path.join(SRC, page));
  html = html.replace(/<!--@([a-z0-9_-]+)-->/gi, (m, name) => {
    if (!(name in partials)) { console.warn('  ! 缺少片段', name, 'in', page); return m; }
    return partials[name];
  });
  html = html.replaceAll('{{VER_CSS}}', VER_CSS).replaceAll('{{VER_JS}}', VER_JS);
  /* 让 JS 存在时才启用入场动画，脚本挂了内容也不会隐身 */
  html = html.replace(
    '</head>',
    '<script>(function(){try{if(localStorage.getItem("nex-theme")==="light")document.documentElement.classList.add("theme-light")}catch(e){}}());document.documentElement.classList.add("js")</script>\n</head>'
  );
  const out = path.join(ROOT, page);
  fs.writeFileSync(out + '.tmp', html);
  fs.renameSync(out + '.tmp', out);
  count++;
  console.log('  写入', page, (html.length / 1024).toFixed(1) + 'KB');
}
console.log(`完成：${count} 个页面 · css ${VER_CSS} · js ${VER_JS}`);

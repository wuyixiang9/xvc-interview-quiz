import { defineConfig } from 'vite';

// 读取并压缩 CSS，返回 JS 模块字符串
// base 用于将 CSS 中的绝对路径 SVG 替换为带前缀的路径
const buildCssModule = async (root, base = '/') => {
  const { readFile, writeFile, mkdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { transform } = await import('lightningcss');
  const out_dir = join(root, 'public/theme');
  await mkdir(out_dir, { recursive: true });
  const css = await readFile(join(root, 'src/v-scroll.css'), 'utf-8');
  const { code } = transform({ filename: 'v-scroll.css', code: Buffer.from(css), minify: true });
  // 将 /scroll.svg、/grab.svg 替换为实际部署路径
  const minified = code.toString()
    .replace(/url\(\/scroll\.svg\)/g, `url(${base}scroll.svg)`)
    .replace(/url\(\/grab\.svg\)/g, `url(${base}grab.svg)`);
  const escaped = minified.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const js_content = `export default '${escaped}';`;
  await writeFile(join(out_dir, 'v-scroll.js'), js_content);
  return js_content;
};

const cssToJsPlugin = () => {
  let css_module = '',
      base = '/';
  return {
    name: 'css-to-js-module',
    async configResolved(config) {
      base = config.base || '/';
      css_module = await buildCssModule(config.root, base);
    },
    // dev 模式：拦截 "$/" 前缀的 import，直接返回 CSS 模块内容
    resolveId(id) {
      if (id.startsWith('$/')) return '\0' + id;
    },
    load(id) {
      if (id.startsWith('\0$/')) return css_module;
    },
    // build 模式：重写 importmap 中的 "$/" 路径，加上 base 前缀
    transformIndexHtml(html) {
      if (base === '/') return html;
      return html.replace(
        /"(\$\/)"\s*:\s*"\/theme\/"/,
        `"$1": "${base}theme/"`
      );
    }
  };
};

export default defineConfig({
  // 默认根路径；GitHub Pages 部署时通过环境变量覆盖：BASE_URL=/repo-name/ bun run build
  base: process.env.BASE_URL || '/',
  plugins: [cssToJsPlugin()],
  build: {
    rollupOptions: {
      // build 时排除 "$/" 开头的 import，保留到产物中由 importmap 处理
      external: (id) => id.startsWith('$/'),
    }
  }
});

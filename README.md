# v-scroll

零依赖的原生虚拟滚动条 Web Component。隐藏系统滚动条，接管外观，支持 CSS 变量主题定制、拖拽弹簧跟手、松手惯性、hover 展开动效。

## 快速接入

### 1. 引入组件

在页面 `<head>` 中添加 Import Map（用于主题路径解析），然后引入组件脚本：

```html
<script type="importmap">
{
  "imports": {
    "$/": "/theme/"
  }
}
</script>

<script type="module" src="/src/v-scroll.js"></script>
```

> **注意**：`importmap` 必须放在所有 `type="module"` 脚本之前。

### 2. 使用标签

用 `<v-scroll>` 包裹任意内容即可，组件会自动接管滚动行为：

```html
<v-scroll style="width: 600px; height: 400px;">
  <div>内容段落 1</div>
  <div>内容段落 2</div>
  <!-- 任意 DOM 内容 ... -->
</v-scroll>
```

组件自适应内容高度，内容不超出容器时自动隐藏滚动条。

### 3. 放置静态资源

将 `public/` 目录下的两个光标 SVG 部署到站点根路径：

```
public/
├── scroll.svg   # 悬停滑块时的上下箭头光标
└── grab.svg     # 拖拽滑块时的抓手光标
```

---

## 主题定制

所有外观属性通过 CSS 变量暴露，直接在页面样式中覆盖即可：

```css
v-scroll {
  --bar-color:       #b0b0b0;  /* 滑块静止颜色 */
  --bar-color-hover: #888888;  /* 滑块悬停颜色 */
  --bar-color-drag:  #555555;  /* 滑块拖拽颜色 */
  --bar-w:           6px;      /* 滑块宽度 */
  --bar-radius:      3px;      /* 滑块圆角 */
  --track-bg:        #e8e8e8;  /* 轨道展开时的背景色 */
  --track-border:    #d0d0d0;  /* 轨道展开时的左边框色 */
}
```

**示例：蓝色主题**

```css
v-scroll.theme-blue {
  --bar-color:       #90caf9;
  --bar-color-hover: #1976d2;
  --bar-color-drag:  #0d47a1;
  --bar-w:           10px;
  --bar-radius:      5px;
  --track-bg:        #e3f2fd;
  --track-border:    #90caf9;
}
```

也可以通过修改 `importmap` 的 `"$/"` 路径指向不同的 `theme/` 目录，实现整站主题切换。

---

## 构建与部署

```bash
bun i        # 安装依赖
./build.sh   # 普通构建（根路径部署，适用于 Cloudflare Pages 等）
```

### 部署到 GitHub Pages（子路径）

GitHub Pages 的访问路径为 `https://username.github.io/repo-name/`，需要将仓库名作为 base 路径传入：

```bash
BASE_URL=/xvc-interview-quiz/ bun run build
# 或直接用预设脚本
bun run build:gh
```

构建后 `dist/` 即为静态产物，将其推送到 `gh-pages` 分支即可。`dist/` 目录结构：

```
dist/
├── assets/index-xxx.js   # 组件逻辑（已 bundle）
├── theme/v-scroll.js     # 压缩后的 CSS 模块（importmap 指向此处）
├── grab.svg              # 拖拽光标
├── scroll.svg            # 悬停光标
└── index.html            # 入口页面
```

---

## 架构说明

```
src/v-scroll.js          组件逻辑入口
src/v-scroll.css         外观样式（通过 ::part() 暴露给外部）
public/theme/v-scroll.js Vite 插件自动生成（CSS 压缩为 JS 模块）
vite.config.js           Vite 配置 + 自定义 cssToJs 插件
```

### Shadow DOM 结构

```
<v-scroll>  ← 宿主元素，CSS 变量定义在此
  #shadow-root
  ├── <style>           内部布局样式（不含外观）
  ├── <div class="vp">  overflow: auto 真实滚动容器（系统滚动条已隐藏）
  │   └── <div class="ct">
  │       └── <slot>    代理外部任意 DOM 内容
  └── <div part="track"> 自定义滚动轨道
      └── <b part="bar"> 自定义滚动滑块
```

### CSS 模块化构建流程

Vite 自定义插件 `cssToJsPlugin` 在 `configResolved` 钩子中触发：

1. 读取 `src/v-scroll.css` 源码
2. 用 `lightningcss` 压缩（保留 CSS 变量，不做语义内联）
3. 包装为 `export default '...';` 格式写入 `public/theme/v-scroll.js`

组件运行时执行 `import CSS from '$/v-scroll.js'`，将样式字符串注入 `document.head`，仅注入一次。dev 模式下由插件的 `resolveId`/`load` 钩子在内存中直接响应；build 模式下通过 `rollupOptions.external` 排除，交由浏览器 importmap 在运行时解析。

### 交互状态机

| 状态 | track 表现 | 触发条件 |
|------|-----------|---------|
| idle | 完全隐藏（opacity 0） | 初始 / 停止滚动 1.5s 后 |
| scrolling | 细条（6px），透明背景 | 滚轮滚动时 |
| expanded | 宽条（18px），带背景和边框 | 鼠标 hover 轨道区域 |
| dragging | expanded 态 + 深色滑块 | 按下滑块拖拽 |

退出 expanded 时，先收缩宽度（0.4s）再淡出 opacity（0.6s），两段动效顺序衔接，避免视觉割裂。

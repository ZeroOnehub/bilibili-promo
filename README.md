<div align="center">

# 📺 哔哩哔哩 bilibili 产品宣传页

**「整页就是一支 B 站视频」：滚动就是播放，章节就是分 P，还能发弹幕、一键三连。**

### 👉 [点这里打开在线预览：https://zeroonehub.github.io/bilibili-promo/](https://zeroonehub.github.io/bilibili-promo/) 👈

[![在线预览](https://img.shields.io/badge/在线预览-点击打开-FF6699?style=for-the-badge&logo=bilibili&logoColor=white)](https://zeroonehub.github.io/bilibili-promo/)
[![GitHub 仓库](https://img.shields.io/badge/GitHub-源码-18191C?style=for-the-badge&logo=github)](https://github.com/ZeroOnehub/bilibili-promo)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-原生-F7DF1E?logo=javascript&logoColor=black)
![无依赖](https://img.shields.io/badge/依赖-0-00AEEC)
![课程作业](https://img.shields.io/badge/用途-课程作业-FFD23F)

</div>

---

## 📖 目录

- [项目简介](#-项目简介)
- [在线预览](#-在线预览)
- [页面结构](#-页面结构)
- [交互亮点](#-交互亮点)
- [快捷键与操作](#️-快捷键与操作)
- [设计风格](#-设计风格)
- [技术实现](#-技术实现)
- [目录结构](#-目录结构)
- [本地运行](#-本地运行)
- [部署到 GitHub Pages](#-部署到-github-pages)
- [自定义修改](#️-自定义修改)
- [兼容性与无障碍](#-兼容性与无障碍)
- [声明](#-声明)

---

## ✨ 项目简介

这是一个介绍 **哔哩哔哩（bilibili）** 的单页宣传网站（课程作业版）。它把「弹幕、分区、UP 主、一键三连」这些 B 站特色，做成了能直接动手玩的交互，带你三分钟看懂 B 站。

整个页面被设计成**一支 05:20 的 B 站视频**：

- 页面底部有一条播放器进度条，**往下滚动 = 视频在播放**；
- 每个章节就是视频的一个**分 P**（P1 ~ P5），顶栏就是分 P 列表；
- 进度条上还有 B 站标志性的**高能进度条**，弹幕越多的章节波峰越高；
- 点 ▶ 按钮，页面会**自动往下播放**，适合上课投屏展示。

项目只用了原生 **HTML + CSS + JavaScript**，没有任何框架和构建工具，双击 `index.html` 就能打开。

---

## 🌐 在线预览

| 方式 | 地址 |
| --- | --- |
| 🔗 在线访问（推荐） | **<https://zeroonehub.github.io/bilibili-promo/>** |
| 💻 源码仓库 | <https://github.com/ZeroOnehub/bilibili-promo> |

> 💡 建议使用电脑浏览器打开，体验完整的鼠标跟随、横向滚动等效果；手机上也做了适配，可以直接扫码或点链接查看。

---

## 🎬 页面结构

页面按「一支视频」的顺序组织，每个章节都有对应的时间码：

| 分 P | 时间码 | 章节 | 内容 |
| :---: | :---: | --- | --- |
| 开场 | 00:00 | **你感兴趣的视频都在 B 站** | 满屏滚动的弹幕、可以自己发弹幕的输入框、眼睛会跟着鼠标转的小电视 |
| P1 | 00:42 | **弹幕，一起看才有意思** | 模拟播放画面上飘过弹幕，「⚠ 前方高能预警」；介绍实时弹幕、高能进度条、弹幕礼仪 |
| P2 | 01:36 | **万物皆可 B 站** | 番剧、知识、游戏、音乐、舞蹈、科技、动物圈、美食、鬼畜、影视、运动、生活 12 个分区贴纸卡片 |
| P3 | 02:30 | **每个人都可以是 UP 主** | 拍 → 剪 → 投 → 被看见四步走；一张可以点赞、投币、收藏、「一键三连」的视频卡片 |
| P4 | 03:24 | **从 2009 到现在** | 编年史：Mikufans → 改名 bilibili → BML → 纳斯达克上市 → 最美的夜 → 《后浪》 → 香港二次上市 |
| P5 | 04:10 | **用数据说话** | 月活 3.4 亿+、日活 1 亿+、月活 UP 主 300 万+、日均播放 41 亿+，数字滚动出现 |
| 片尾 | — | **感谢观看！剩下的精彩，去 B 站看** | 「(゜-゜)つロ 干杯~」弹幕刷屏，iPhone / Android 下载与网页版入口 |

---

## 🎮 交互亮点

### 1. 弹幕引擎
- 开场、P1 播放画面、片尾三块「舞台」都有实时飘过的弹幕；
- 弹幕按**轨道**排布，同一轨道上一条弹幕尾巴没离开前不放下一条，避免重叠；
- 会自动**避开标题和按钮**所在的轨道，不挡内容；
- 开场可以**自己输入并发送弹幕**（最多 30 字），发出后会出现在屏幕上；
- 底部播放器上的「弹」按钮是**全局弹幕开关**。

### 2. 底部播放器（整页就是一支视频）
- 滚动位置实时换算成 `当前时间 / 05:20`；
- 进度条按章节**分段**，鼠标悬停显示「章节名 · 时间」，当前章节名显示在右侧；
- **高能进度条**：弹幕越多的章节，波形越高；
- 进度条可以**点击跳转**，也支持键盘操作；
- ▶ **自动播放**：页面以固定速度自动向下滚动，滚到底自动停止；滚轮、触摸、键盘翻页会自动暂停。

### 3. 一键三连
- 视频卡片上的 👍 点赞、🪙 投币、⭐ 收藏可以分别点击，数字实时变化；
- **长按点赞约 1 秒**触发一键三连（和 B 站 App 一样），也可以直接点「⚡ 直接三连」；
- 三连时有表情粒子爆开和提示气泡；分享按钮会提示「链接已复制（演示效果）」。

### 4. 其他细节
- **小电视的眼睛跟着鼠标转**（仅在有鼠标的设备上启用）；
- **编年史竖着滚、横着走**：纵向滚动时时间线横向平移；手机上自动改为竖排；
- **数字滚动**：数据章节进入视口时，数字从 0 滚动到目标值；
- **滚动出现**：各元素进入视口时依次浮现；
- 站内锚点**平滑滚动**，顶栏高亮当前所在分 P。

---

## ⌨️ 快捷键与操作

| 操作 | 效果 |
| --- | --- |
| `空格` | 播放 / 暂停自动滚动（输入框内打字时不生效） |
| 聚焦进度条后 `←` `→` / `↑` `↓` | 前后跳转 3% 进度 |
| 聚焦进度条后 `Home` / `End` | 跳到开头 / 结尾 |
| 点击进度条 | 跳转到对应位置 |
| 长按 👍 点赞 | 一键三连 |
| 滚轮、触摸滑动、`PageUp` / `PageDown` | 自动暂停自动播放 |
| 点击顶栏 P1 ~ P5 | 平滑跳转到对应章节 |

---

## 🎨 设计风格

- **视觉语言**：浅色纸面背景 + 粗描边 + 硬投影的「贴纸风」，卡片带轻微随机旋转；
- **配色**：B 站粉 `#FF6699`、B 站蓝 `#00AEEC`、明黄 `#FFD23F`，墨色 `#18191C`，纸色 `#F6F4EF`；
- **字体**：Noto Sans SC（正文）、ZCOOL QingKe HuangYou（标题点缀）、Archivo Black（英文数字）、JetBrains Mono（时间码）；字体异步加载，加载失败会自动退回系统字体，不会卡住页面；
- **图标**：B 站小电视用内联 SVG `<symbol>` 绘制，全站复用，网站图标（favicon）也是它。

---

## 🛠 技术实现

| 方面 | 说明 |
| --- | --- |
| 技术栈 | 原生 HTML5 + CSS3 + ES5 JavaScript，**零依赖、零构建** |
| 样式组织 | CSS 自定义属性（`:root` 变量）统一管理颜色、描边、阴影、圆角 |
| 动画 | CSS 动画 + `requestAnimationFrame`；弹幕使用 transform 位移，性能友好 |
| 进度映射 | 滚动距离 ↔ 视频时间（`TOTAL = 320` 秒）双向换算，处理分段之间的缝隙 |
| 视口检测 | `IntersectionObserver` 实现滚动出现、数字滚动、片尾弹幕触发 |
| 响应式 | 断点 `1100px` / `900px` / `760px` / `420px`，手机端编年史改为竖排 |
| 部署 | 纯静态文件，附带 `.nojekyll`，可直接用 GitHub Pages 托管 |

---

## 📁 目录结构

```text
bilibili-promo/
├── index.html   # 页面结构：顶栏、开场、P1~P5 五个章节、片尾、页脚、底部播放器
├── style.css    # 全部样式：设计变量、贴纸风组件、各章节样式、响应式、减少动态效果
├── script.js    # 全部交互：弹幕引擎、播放器、一键三连、编年史、数字滚动等
├── .nojekyll    # 告诉 GitHub Pages 不要用 Jekyll 处理，原样发布静态文件
├── .gitignore
└── README.md
```

---

## 🚀 本地运行

项目是纯静态页面，无需安装任何依赖。

**方式一：直接打开**

```bash
git clone https://github.com/ZeroOnehub/bilibili-promo.git
cd bilibili-promo
# 双击 index.html，或：
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

**方式二：启动本地服务器（推荐，行为与线上一致）**

```bash
# Python 3
python3 -m http.server 8000

# 或 Node.js
npx serve .
```

然后在浏览器访问 <http://localhost:8000>。

---

## 📦 部署到 GitHub Pages

1. 打开仓库 **Settings → Pages**；
2. **Source** 选择 `Deploy from a branch`；
3. **Branch** 选择 `main`（或存放页面的分支），目录选 `/ (root)`，点 **Save**；
4. 等待一两分钟，页面会发布到：**<https://zeroonehub.github.io/bilibili-promo/>**

> 如果 fork 了本项目，地址会变为 `https://<你的用户名>.github.io/bilibili-promo/`。

---

## ✏️ 自定义修改

| 想改什么 | 去哪里改 |
| --- | --- |
| 弹幕文案 | `script.js` 顶部「弹幕文案」一节 |
| 主题配色 | `style.css` 中 `:root` 的 `--pink`、`--blue`、`--yellow` 等变量 |
| 「视频」总时长 | `script.js` 中的 `TOTAL`（单位：秒，默认 320 = 05:20） |
| 自动播放速度 | `script.js` 中的 `SPEED`（单位：像素 / 秒，默认 120） |
| 分区、编年史、数据 | `index.html` 中对应章节（`#zones`、`#history`、`#data`） |
| 章节时间码 | `index.html` 中各章节的 `data-timecode` 元素 |

---

## ♿ 兼容性与无障碍

- 支持 Chrome、Edge、Firefox、Safari 等现代浏览器，桌面端与移动端均已适配；
- 系统开启「**减少动态效果**」（`prefers-reduced-motion`）时，自动关闭持续动画和粒子特效；
- 进度条使用 `role="slider"` 并同步 `aria-valuenow`，可以用键盘操作；
- 按钮带 `aria-pressed` / `aria-label`，提示气泡使用 `aria-live`，装饰性弹幕层标记 `aria-hidden`；
- 眼睛跟随鼠标仅在精确指针设备上启用，不影响触屏体验。

---

## 📄 声明

- 本页面为**课程作业展示用途**，**非哔哩哔哩官方网站**；
- 「哔哩哔哩」「bilibili」品牌名称与标识归哔哩哔哩所有；
- 页面中的数据来源于哔哩哔哩公开财报，为约数，仅作课程展示。

<div align="center">

**喜欢的话，记得一键三连 (￣▽￣)ノ**

### [👉 立即打开在线预览](https://zeroonehub.github.io/bilibili-promo/)

</div>

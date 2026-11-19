# METEOR · 坠星小镇

Phaser 3 + 原生 JavaScript 写成的俯视角像素游戏原型。场景取自仓库的序章设定。陨石坠落当天的上午，杂货店店员沿主街去和店主打招呼。

[手机试玩](https://feskenswojciech394-sketch.github.io/meteor-game/) · [查看部署记录](https://github.com/feskenswojciech394-sketch/meteor-game/actions/workflows/pages.yml)

## 运行与操作

在项目根目录运行以下命令，打开 <http://localhost:8000/>。游戏从 `index.html` 启动，Phaser 和所有资源随仓库提供。

```sh
python3 -m http.server 8000
```

电脑用方向键移动，手机拖动左侧摇杆。走近店主后点击「交谈」或按 **E** 开始、逐句继续。**Esc** 收起对话或暂停游戏。旋转手机时角色会留在原地，镜头随屏幕宽高调整。

首次联网打开并缓存完成后可以离线重开。Android Chrome 在浏览器菜单中选择「安装应用」或「添加到主屏幕」。iOS Safari 使用「分享 → 添加到主屏幕」。安装与离线缓存需要 HTTPS 或本机 localhost。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `index.html`、`src/style.css` | 游戏页面、对话框与横竖屏布局 |
| `src/main.js`、`src/controls.js` | 读入数据、启动 Phaser、处理键盘和摇杆 |
| `src/scenes/TownScene.js` | 场景、碰撞、镜头和交谈距离 |
| `src/art/` | 用矩形色块绘制地面、房屋、树木、角色和图标 |
| `assets/world.json`、`assets/maps/` | 地图索引与地图数据 |
| `assets/dialogues/town.json` | 对话 ID 对应的逐句台词 |
| `assets/vendor/`、`assets/icons/` | Phaser 3.90.0 Arcade Physics 发行版及其 MIT 许可、PWA 图标 |
| `manifest.json`、`sw.js` | 安装信息与离线缓存 |
| `.github/workflows/pages.yml`、`tests/smoke.cjs` | Pages 发布与浏览器试玩检查 |

## 扩展游戏

- **新增地图**　复制 `assets/maps/main-street.json`，在 `assets/world.json` 的 `maps` 里加一项，例如 `"garden": "./assets/maps/garden.json"`。访问 `./?map=garden` 可直接试玩，将 `startMap` 改为 `garden` 可设为默认地图。离线缓存会读取这个索引。
- **画地形**　`tiles` 每行等宽，一格 16×16 像素。`.` 是草，`=` 是路，`#` 是可碰撞的石墙，`~` 是水。坐标从左上角向右、向下递增。`spawn`、NPC 的 `at` 和 `props` 都使用原始地图像素，以脚底为锚点。`props` 条目形如 `["oak", 80, 120]`。围栏多一个长度参数，例如 `["fence", 96, 80, 4]`。其他种类及碰撞范围见 `src/art/scenery.js`。
- **新增 NPC**　在地图的 `npcs` 数组中加入唯一 ID、显示名、可到达的坐标及对话 ID。例如 `{"id":"neighbor","name":"邻居","at":[285,150],"dialogue":"neighbor-hello"}`。当附近有多人时，「交谈」会选择视线可达且距离最近的一位。地图的 `objective.npc` 可指向其中一人，完整读完对白会切换为 `objective.done` 的文字。
- **新增或修改对话**　在 `assets/dialogues/town.json` 里加上 `"neighbor-hello": ["早啊！", "今天的街上真安静。"]`。数组顺序就是播放顺序。修改此文件即可调整剧情。

## GitHub Pages

在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。私有仓库需要支持私有仓库 Pages 的 GitHub 套餐。推送到 `main` 或在 Actions 中手动运行 **Deploy game to GitHub Pages** 即可发布。

工作流先用 Chromium 检查移动碰撞、手机横竖屏、交谈和离线启动，再发布 `index.html`、`manifest.json`、`sw.js`、`src/` 和 `assets/`。每次发布用提交 SHA 区分缓存版本。关掉旧游戏窗口后重新进入即可使用新版本。新增 JS、CSS 或其他固定资源时，将路径加入 `sw.js` 的 `CORE`。

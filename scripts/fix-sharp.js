/* eslint-disable @typescript-eslint/no-require-imports -- 独立 CommonJS 脚本：
   必须在无任何构建/转译步骤的前提下直接用 node 运行，require 是有意为之 */
/**
 * sharp 空壳自动修复（幂等）。
 *
 * 背景：@xenova/transformers 在模块加载期 `import sharp from 'sharp'`，
 * 而 sharp 的安装脚本需要从 GitHub Releases 下载预编译二进制——国内网络
 * 下载超时后，require("sharp") 在加载期直接崩溃，拖垮整个 /api/chat。
 *
 * 本项目只用 transformers 做文本嵌入，sharp（图片处理）永远不会被调用，
 * 所以把加载失败的 sharp 副本替换为空壳即可：模块能加载，图片功能
 * 被调用时才抛错。详见 docs/TROUBLESHOOTING.md 问题 5。
 *
 * 行为：
 * - 逐个检查项目内所有 sharp 副本，require 成功（完好或已是空壳）→ 跳过；
 * - require 失败 → 把该副本入口替换为空壳并复验；
 * - sharp 正常时什么都不做，可安全地在 postinstall / dev / build 前反复执行。
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const SHARP_COPIES = [
  path.join(projectRoot, "node_modules", "@xenova", "transformers", "node_modules", "sharp"),
  path.join(projectRoot, "node_modules", "sharp"),
];

const STUB = `// sharp 空壳 —— 本项目只用 @xenova/transformers 做文本嵌入，
// 图片处理（sharp 的唯一用途）不会被调用。
// 空壳让模块加载不报错，图片功能被调用时才抛错。
// 由 scripts/fix-sharp.js 自动生成，npm install 后会自动重写。
module.exports = function sharpStub() {
  throw new Error(
    "sharp 已被替换为空壳：图片功能不可用，文本嵌入不受影响。" +
      "详见 docs/TROUBLESHOOTING.md 问题 5。"
  );
};
`;

function canLoad(sharpDir) {
  try {
    require(sharpDir);
    return true;
  } catch {
    return false;
  }
}

let stubbed = 0;
for (const sharpDir of SHARP_COPIES) {
  const entry = path.join(sharpDir, "lib", "index.js");
  if (!fs.existsSync(entry)) continue; // 副本不存在（npm 提升策略不同）→ 无需处理
  if (canLoad(sharpDir)) continue; // 完好或已是空壳 → 不动

  fs.writeFileSync(entry, STUB);
  if (canLoad(sharpDir)) {
    stubbed++;
    console.log(`[fix-sharp] sharp 加载失败，已替换为空壳：${path.relative(projectRoot, sharpDir)}`);
  } else {
    console.warn(`[fix-sharp] 空壳替换后仍无法加载（可忽略，文本嵌入会自动降级）：${sharpDir}`);
  }
}

if (stubbed === 0) {
  console.log("[fix-sharp] sharp 状态正常，无需处理");
}

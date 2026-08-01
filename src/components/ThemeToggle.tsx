"use client";

// ============================================================
// ThemeToggle — 暗色模式切换（分段选择器）
//
// 三个选项，点哪个直接切换，无循环歧义：
//   ☀️ 浅色   🌓 跟随系统   🌙 深色
//
// 之前是"三态循环按钮"，存在"点了但颜色不变"的过渡态
// （系统为深色时，深色→跟随系统 无视觉变化），
// 改为分段选择器后彻底消除该问题。
//
// 选择持久化到 localStorage（键名 "theme"）。
// 首次绘制前由 layout.tsx 的内联脚本读取并应用，避免闪烁（FOUC）。
// ============================================================

import { useState, useEffect } from "react";

type ThemeMode = "system" | "light" | "dark";

const MODES: { key: ThemeMode; icon: string; label: string }[] = [
  { key: "system", icon: "🌓", label: "跟随系统" },
  { key: "light", icon: "☀️", label: "浅色" },
  { key: "dark", icon: "🌙", label: "深色" },
];

/** 根据当前模式决定是否给 <html> 加 .dark 类 */
function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

/** 从 localStorage 读取用户上次的选择，没有则默认跟随系统 */
function getInitialMode(): ThemeMode {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }
  return "system";
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  // 初始化：应用 localStorage 里的选择
  useEffect(() => {
    const initial = getInitialMode();
    // 必须在水合后读取 localStorage（SSR 阶段没有 window）。
    // 主题初始化是 set-state-in-effect 的合法用途，故关闭该 lint 规则。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initial);
    applyTheme(initial);
  }, []);

  // 跟随系统模式下，系统主题变化时实时切换
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  // 直接选择某个模式（不再循环，点击必有明确反馈）
  function select(modeKey: ThemeMode) {
    setMode(modeKey);
    localStorage.setItem("theme", modeKey);
    applyTheme(modeKey);
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-center rounded-full
                 border border-gray-200 dark:border-white/10
                 bg-white/80 dark:bg-[#14141d]/80 backdrop-blur overflow-hidden"
      role="group"
      aria-label="主题切换"
    >
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => select(m.key)}
          title={m.label}
          aria-label={m.label}
          aria-pressed={mode === m.key}
          className={`px-2.5 py-1.5 text-sm transition-colors select-none cursor-pointer
            ${
              mode === m.key
                ? "bg-violet-500/15 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-violet-600 dark:hover:text-violet-300"
            }`}
        >
          <span aria-hidden>{m.icon}</span>
        </button>
      ))}
    </div>
  );
}

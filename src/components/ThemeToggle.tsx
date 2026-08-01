"use client";

// ============================================================
// ThemeToggle — 暗色模式切换按钮
//
// 三种模式循环切换：
//   🌓 跟随系统 → ☀️ 浅色 → 🌙 深色 → 回到跟随系统
//
// 状态持久化到 localStorage（键名 "theme"）。
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

  // 计算当前模式 + 下一个模式（循环）
  const currentIndex = Math.max(MODES.findIndex((m) => m.key === mode), 0);
  const current = MODES[currentIndex];
  const next = MODES[(currentIndex + 1) % MODES.length];

  function handleClick() {
    const nextMode = next.key;
    setMode(nextMode);
    localStorage.setItem("theme", nextMode);
    applyTheme(nextMode);
  }

  return (
    <button
      onClick={handleClick}
      title={`主题：${current.label}，点击切换为${next.label}`}
      aria-label={`当前主题：${current.label}`}
      className="fixed top-4 right-4 z-50 flex items-center justify-center
                 w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700
                 bg-white/80 dark:bg-gray-900/80 backdrop-blur
                 text-base hover:bg-gray-100 dark:hover:bg-gray-800
                 transition-colors cursor-pointer select-none"
    >
      <span aria-hidden>{current.icon}</span>
    </button>
  );
}

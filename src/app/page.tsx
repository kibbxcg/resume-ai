// ============================================================
// 首页 — 面试官打开的对话页面
//
// 这是一个 Server Component（没有 "use client"），
// 可以在服务端读 profile.yaml，然后通过 props 传给客户端组件
// ============================================================

import ChatWindow from "@/components/ChatWindow";
import { profile } from "@/lib/profile";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Hermes 风格：紫色氛围光（浅色下也保留微弱的品牌色） */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full
                        bg-violet-500/15 dark:bg-violet-600/20 blur-[130px]" />
        <div className="absolute -bottom-24 -right-32 w-[480px] h-[480px] rounded-full
                        bg-indigo-500/10 dark:bg-indigo-500/15 blur-[120px]" />
      </div>
      <div className="relative">
        <ChatWindow
          candidateName={profile.basic.name}
          candidateTitle={profile.basic.title}
        />
      </div>
    </main>
  );
}

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
    <ChatWindow
      candidateName={profile.basic.name}
      candidateTitle={profile.basic.title}
    />
  );
}

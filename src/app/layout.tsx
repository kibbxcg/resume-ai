import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || "ResumeAI",
  description: "AI Resume Assistant — your digital interview avatar",
};

// 首次绘制前设置暗色类，避免主题闪烁（FOUC）。
// 逻辑与 ThemeToggle 保持一致：localStorage 优先，默认跟随系统。
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((!t||t==='system')&&d)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning：内联主题脚本会在水合前给 <html> 加 .dark 类，
  // React 会因此认为服务端/客户端类名不一致，这里明确告知它跳过该元素比对。
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* 放在 body 最前面：同步执行，浏览器会先执行再绘制，从而避免闪白 */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}

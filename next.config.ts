import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // onnxruntime-node 的原生 .so/.dll 文件靠路径动态加载，打包器追踪不到，
  // 显式把整个包打进 serverless 产物，否则部署后嵌入模型（RAG）会因缺原生库挂掉。
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/**"],
    "/api/dashboard": ["./node_modules/onnxruntime-node/bin/**"],
  },
  // 全站安全响应头：
  // - X-Frame-Options: DENY 防点击劫持（尤其是带 ?key= 的 /dashboard）
  // - Referrer-Policy 跨域只发源，防止 URL 里的 dashboard 密钥通过 Referer 外泄
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

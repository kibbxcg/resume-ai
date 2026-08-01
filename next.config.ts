import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // onnxruntime-node 的原生 .so/.dll 文件靠路径动态加载，打包器追踪不到，
  // 显式把整个包打进 serverless 产物，否则部署后嵌入模型（RAG）会因缺原生库挂掉。
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/**"],
    "/api/dashboard": ["./node_modules/onnxruntime-node/bin/**"],
  },
};

export default nextConfig;

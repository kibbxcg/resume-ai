// ============================================================
// LLM Provider 抽象层
//
// 职责：
//   1. 根据 LLM_PROVIDER 环境变量选择对应的 API
//   2. 统一接口：所有 Provider 都暴露一个 streamChat() 方法
//   3. 新增厂商只需在 PROVIDERS 对象里加一条配置 → 零改动其他文件
//
// 用到的环境变量：
//   LLM_PROVIDER  — 必填，选厂商（openai / deepseek / zhipu / qwen / moonshot）
//   LLM_API_KEY   — 必填，对应厂商的 API Key
//   LLM_MODEL     — 可选，覆盖默认模型
//   LLM_BASE_URL  — 可选，覆盖默认 API 地址（用于代理/中转站）
// ============================================================

// ↓ 当前版本只用这一个，后续可以扩展为完整的 Provider 接口
// interface LLMProvider {
//   streamChat(systemPrompt: string, userMessage: string): Promise<ReadableStream>;
// }

// ============================================================
// 第 1 部分：厂商配置表
// 所有支持的 LLM 厂商在这里注册，包括 API 地址和默认模型
// ============================================================

interface ProviderConfig {
  name: string;        // 显示用
  baseURL: string;     // API 地址
  defaultModel: string;// 默认模型（用户不填 LLM_MODEL 时用这个）
}

// 用 Record 类型：key 是 LLM_PROVIDER 的值，value 是配置
const PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  openai: {
    name: "OpenAI",
    baseURL: "https://api.openai.com",
    defaultModel: "gpt-4o-mini",
  },
  zhipu: {
    name: "智谱 GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
  },
  qwen: {
    name: "通义千问",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-turbo",
  },
  moonshot: {
    name: "Moonshot",
    baseURL: "https://api.moonshot.cn",
    defaultModel: "moonshot-v1-8k",
  },
};

// ============================================================
// 第 2 部分：从环境变量读取配置，组装成可用的参数
// ============================================================

function getConfig() {
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;
  const customModel = process.env.LLM_MODEL;      // 可选
  const customBaseURL = process.env.LLM_BASE_URL;  // 可选

  // 检查：LLM_PROVIDER 没填
  if (!provider) {
    throw new Error(
      `未设置 LLM_PROVIDER 环境变量！\n` +
      `请在 .env.local 中设置，例如：\n` +
      `  LLM_PROVIDER=deepseek\n` +
      `支持的厂商：${Object.keys(PROVIDERS).join(", ")}`
    );
  }

  // 检查：LLM_PROVIDER 填了一个我们不支持的值
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(
      `不支持的 LLM_PROVIDER: "${provider}"\n` +
      `支持的厂商：${Object.keys(PROVIDERS).join(", ")}`
    );
  }

  // 检查：API Key 没填
  if (!apiKey) {
    throw new Error(
      `未设置 LLM_API_KEY 环境变量！\n` +
      `请在 .env.local 中设置你的 ${config.name} API Key。`
    );
  }

  // 最终参数：
  //   baseURL → 优先用自定义的 LLM_BASE_URL，否则用厂商默认地址
  //   model   → 优先用自定义的 LLM_MODEL，否则用厂商默认模型
  return {
    baseURL: customBaseURL || config.baseURL,
    model: customModel || config.defaultModel,
    apiKey,
    providerName: config.name,
  };
}

// ============================================================
// 第 3 部分：核心方法 — 调用 LLM 并返回流式响应
//
// 因为目前所有支持的厂商 API 都兼容 OpenAI 的格式
// （POST /v1/chat/completions，Bearer Token，SSE 流式）
// 所以这里用一个通用实现就够了。
// 如果将来有厂商不兼容 OpenAI 格式，再在这里分支处理。
// ============================================================

/**
 * 发送消息给 LLM，返回一个 ReadableStream（SSE 流式响应）
 *
 * @param systemPrompt - 由 prompt.ts 拼好的 System Prompt
 * @param userMessage  - 面试官当前输入的问题
 * @returns ReadableStream — 每个 chunk 是一小段 AI 回复文本（SSE 格式）
 */
export async function streamChat(
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream> {
  const config = getConfig();

  // 拼接完整 API URL（所有兼容 OpenAI 的厂商都用 /chat/completions 路径）
  const url = `${config.baseURL}/chat/completions`;

  // 准备请求体
  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage },
    ],
    stream: true,          // 关键：开启流式响应，AI 一个字一个字地回
    temperature: 0.7,      // 控制随机性（0 = 一本正经，1 = 天马行空）
    max_tokens: 2000,      // 单次回复上限
  });

  // 发起 HTTP 请求
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body,
  });

  // API 返回了错误状态码 → 把错误信息转成人类可读的提示
  if (!response.ok) {
    const errorText = await response.text().catch(() => "未知错误");
    throw new Error(
      `${config.providerName} API 返回错误 (${response.status})\n` +
      `可能原因：API Key 无效、账户余额不足、或模型不可用。\n` +
      `详细信息：${errorText.slice(0, 200)}`
    );
  }

  // response.body 是一个 ReadableStream
  // 直接返回给调用方（route.ts），由它 pipe 到前端
  if (!response.body) {
    throw new Error(`${config.providerName} 未返回响应流，请重试。`);
  }

  return response.body;
}

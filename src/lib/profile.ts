import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import path from "path";

// ============================================================
// 第 1 部分：Zod Schema 定义
// 这里定义了 profile.yaml 的数据结构，和你在 profile.example.yaml 里看到的字段一一对应
// ============================================================

// 基本信息
const BasicSchema = z.object({
  name: z.string(),                              // 必填：你的名字
  title: z.string(),                             // 必填：你的职位
  location: z.string(),                          // 必填：所在城市
  email: z.string().email(),                     // 必填：邮箱，必须是合法邮箱格式
  github: z.string().url(),                      // 必填：GitHub 主页链接
  website: z.string().url().optional(),          // 可选：个人网站
});

// 工作经历中的每条
const ExperienceSchema = z.object({
  company: z.string(),                           // 公司名
  role: z.string(),                              // 职位
  period: z.string(),                            // 时间段，如 "2023.01 - 至今"
  highlights: z.array(z.string()),               // 用几个点描述你做了什么
});

// 项目经历中的每条
const ProjectSchema = z.object({
  name: z.string(),                              // 项目名
  url: z.string().url().optional(),              // 可选：项目链接
  description: z.string(),                       // 一句话描述
  techs: z.array(z.string()),                    // 用到的技术栈
});

// 教育经历中的每条
const EducationSchema = z.object({
  school: z.string(),                            // 学校名
  degree: z.string(),                            // 学历，如 "本科" / "硕士"
  major: z.string(),                             // 专业
  period: z.string(),                            // 时间段，如 "2016 - 2020"
});

// AI 人设
const PersonaSchema = z.object({
  // 语气风格：只能是这三个值之一
  tone: z.enum(["专业严谨", "轻松活泼", "正式商务"]),
  // 语言偏好
  language: z.enum(["zh", "en"]),
  // 额外指令：写在这里的话会直接塞进 System Prompt 里
  extra_instructions: z.string().optional(),
});

// 顶层 Schema：把上面的小 Schema 拼成完整的数据结构
const ProfileSchema = z.object({
  basic: BasicSchema,
  summary: z.string(),                           // 自我介绍（自由文本）
  experience: z.array(ExperienceSchema),          // 工作经历列表
  projects: z.array(ProjectSchema),               // 项目经历列表
  education: z.array(EducationSchema),            // 教育经历列表
  skills: z.array(z.string()),                    // 技能标签
  persona: PersonaSchema,
});

// 从 Schema 推导出 TypeScript 类型（后面的文件可以直接 import 这个类型用）
export type Profile = z.infer<typeof ProfileSchema>;

// ============================================================
// 第 2 部分：读取 + 解析 YAML 文件
// ============================================================

// profile.yaml 放在项目根目录（和 package.json 同一层）
const profilePath = path.join(process.cwd(), "profile.yaml");

// 如果用户在部署时忘了放 profile.yaml，给一个明确的报错信息
if (!existsSync(profilePath)) {
  throw new Error(
    `找不到 profile.yaml！\n` +
    `请复制 profile.example.yaml 为 profile.yaml，填入你的真实信息。\n` +
    `文件位置：${profilePath}`
  );
}

// 读 YAML 文件内容
const rawYaml = readFileSync(profilePath, "utf-8");

// 解析 YAML → JavaScript 对象
const parsedYaml = parseYaml(rawYaml);

// ============================================================
// 第 3 部分：校验 + 导出
// ============================================================

// Zod 校验：如果 YAML 里的数据格式不对（比如必填字段缺失、email 格式错误）
// Zod 会自动抛出一个带详细信息的错误，告诉你哪一行有问题
export const profile = ProfileSchema.parse(parsedYaml);

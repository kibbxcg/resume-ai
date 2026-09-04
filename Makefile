.PHONY: dev build start lint type-check test check deploy

# 本地开发
dev:
	npm run dev

# 生产构建
build:
	npm run build

# 本地预览生产构建
start:
	npm run start

# ESLint 检查
lint:
	npm run lint

# TypeScript 类型检查
type-check:
	npx tsc --noEmit

# 单元测试
test:
	npm run test

# 全量检查（CI 入口）
check: lint type-check test

# 部署到 Vercel
deploy:
	vercel deploy --prod

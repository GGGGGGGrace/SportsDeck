# 阶段 1：安装所有依赖 (deps)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 只复制 package.json 和 lock 文件，利用 Docker 缓存机制
COPY package.json package-lock.json* ./
# 如果你们用的是 npm，用 npm ci。如果是 yarn/pnpm，请替换对应命令
RUN npm ci

# 阶段 2：编译打包 (builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma 客户端 (非常重要，否则后端查不到数据库)
RUN npx prisma generate

# 生产模式构建 Next.js
RUN npm run build

# 阶段 3：运行环境 (runner)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 安装 openssl 供 Prisma 生产环境运行使用
RUN apk add --no-cache openssl

# 暴露端口
EXPOSE 3000

# 从 builder 阶段只复制运行必需的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# 启动 Node.js 服务器 (Standalone 模式的入口文件)
CMD ["node", "server.js"]
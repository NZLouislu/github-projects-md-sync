# 模拟发布 0.1.11 版本并在外部项目回归测试指南

本文档面向希望在发布 `github-projects-md-sync` 新版本前完成真实场景验证的高级开发与测试工程师，目标是以 0.1.11 为例，完成本地模拟打包、在其他项目安装验证以及回归测试流程。

## 1. 前提准备

- 已完成所有代码合并，工作区干净
- Node.js 18+ 与 npm 9+
- 具备 npm 发布权限的账号（用于最终上线）
- PowerShell 或 Bash 终端

在开始之前，建议执行以下命令确认环境与依赖：

```bash
npm ci
npm run lint
npm test
```

## 2. 更新版本号至 0.1.11

保持当前分支为 `main`。若仅需模拟发布且暂不生成 git tag，使用以下命令：

```bash
npm version 0.1.11 --no-git-tag-version
```

确认 `package.json` 与 `package-lock.json` 中的版本号已同步为 0.1.11。版本号调整完成后立刻构建保证输出目录与版本一致。

## 3. 构建并执行回归用例

```bash
npm run build
npm test
```

若存在端到端或示例脚本，可在 `tests/`、`examples/` 目录内执行自定义验证，确保新版本可覆盖高风险路径。

## 4. 进行 npm 发布演练

### 4.1 验证打包清单

```bash
npm publish --dry-run
```

重点检查输出中的 `npm notice === Tarball Contents ===`，确认未包含临时文件、图像或体积较大的测试工件。如需调整，修改 `.npmignore` 或 `package.json` 的 `files` 字段后重新执行。

### 4.2 生成本地离线包

```bash
npm pack
```

命令将生成 `github-projects-md-sync-0.1.11.tgz`，可使用以下命令验证包内容：

```bash
tar -tf github-projects-md-sync-0.1.11.tgz
```

## 5. 在独立项目中模拟消费 0.1.11

### 5.1 创建测试项目

```bash
mkdir md-sync-consumer
cd md-sync-consumer
npm init -y
```

在 Windows 环境下，使用绝对路径安装刚生成的 `.tgz` 包：

```bash
npm install "e:\\Next.js\\md-sync-workspace\\github-projects-md-sync\\github-projects-md-sync-0.1.11.tgz"
```

安装完成后，`package.json` 的 dependencies 中应出现 `github-projects-md-sync: file:...` 条目。

### 5.2 运行集成校验

在测试项目中创建 `index.ts` 并执行核心调用：

```typescript
import { mdToProject, projectToMd } from "github-projects-md-sync";

async function bootstrap() {
  const projectId = process.env.PROJECT_ID ?? "placeholder";
  const githubToken = process.env.GITHUB_TOKEN ?? "placeholder";
  await mdToProject(projectId, githubToken, "./fixtures/md");
  await projectToMd(projectId, githubToken, "./output" );
}

bootstrap().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
```

执行以下命令验证：

```bash
npx ts-node index.ts
```

重点关注导出目录、错误处理、网络调用超时以及令牌权限错误提示是否符合预期。

### 5.3 自动化脚本（可选）

如需在 CI 中复用验证，可在测试项目中新增 `package.json` 脚本：

```json
{
  "scripts": {
    "pretest": "npm run build --prefix ..\\github-projects-md-sync",
    "test": "npx ts-node index.ts"
  }
}
```

`pretest` 脚本可确保主仓库的最新构建成果被打包。

## 6. 使用 npm link 进行实时调试（可选）

当需要频繁迭代与即时验证时，采用符号链接方式：

```bash
# 在 github-projects-md-sync 根目录执行
npm run build
npm link

# 在消费项目中执行
npm link github-projects-md-sync
```

构建后再次运行消费项目的测试脚本，即可获取最新源码行为。

## 7. 验证完成后的回滚与提交流程

1. 删除临时生成的 `.tgz` 文件与测试项目
2. 若版本号仅用于演练，可通过 `git checkout -- package.json package-lock.json` 回退
3. 若计划发布正式版，提交版本号与构建成果：

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 0.1.11"
```

完成上述验证后，即可在窗口期执行正式 `npm publish` 并推送 git tag，确保生产环境与演练结果保持一致。

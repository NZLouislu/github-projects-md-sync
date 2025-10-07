import { spawn } from "child_process";

const args = process.argv.slice(2);
const map: Record<string, string> = {
  examples: "tests/**/*.test.ts",
  "examples/md": "tests/md-to-project.test.ts",
  "examples/project": "tests/project-to-md.test.ts"
};

const pat = map[args[0] as string] ?? "tests/**/*.test.ts";
const cmdArgs = [require.resolve("mocha/bin/mocha"), "-r", "ts-node/register", pat];

spawn(process.execPath, cmdArgs, { stdio: "inherit" }).on("exit", (code) => process.exit(code === null ? 1 : code));
import { strict as assert } from "assert";
import fs from "fs/promises";
import path from "path";

describe("NPM Package Structure Validation", () => {
  it("should have critical fields in package.json", async () => {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkgRaw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);

    assert.ok(pkg.name && typeof pkg.name === "string");
    assert.ok(pkg.version && typeof pkg.version === "string");
    assert.ok(pkg.main && typeof pkg.main === "string");
    assert.ok(pkg.types && typeof pkg.types === "string");
    assert.ok(pkg.exports, "exports should be defined");
    assert.ok(pkg.dependencies || pkg.devDependencies, "dependencies should exist");
  });

  it("should have dist directory and type declarations", async () => {
    const distDir = path.join(process.cwd(), "dist");
    try {
      await fs.access(distDir);
    } catch {
      assert.fail("dist directory not found; run build before publish");
    }
    // Heuristic: ensure at least one .d.ts exists
    const files = await fs.readdir(distDir);
    const hasDts = files.some(f => f.endsWith(".d.ts")) || (await fs.readdir(path.join(distDir, "src")).catch(() => [])).some(f => f.endsWith(".d.ts"));
    assert.ok(hasDts, "Type declarations (.d.ts) should be present in dist");
  });
});
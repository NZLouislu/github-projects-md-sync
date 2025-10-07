import { isStoryFile } from "../src/project-sync";
import assert from "assert";

describe('isStoryFile', () => {
  it('should detect standard story format', () => {
    const content = '## Story: Test Feature\n### Status\nDone';
    assert.strictEqual(isStoryFile(content), true);
  });

  it('should detect flexible story format', () => {
    const content = '##story: Another Feature\n### Status\nReady';
    assert.strictEqual(isStoryFile(content), true);
  });

  it('should detect story format with extra spaces', () => {
    const content = '##  Story  : Feature with spaces\n### Status\nIn Progress';
    assert.strictEqual(isStoryFile(content), true);
  });

  it('should not detect todo list as story', () => {
    const content = '## Backlog\n- Story: Setup environment\n- [ ] Install tools';
    assert.strictEqual(isStoryFile(content), false);
  });

  it('should not detect regular headings as story', () => {
    const content = '## Introduction\nThis is a regular heading';
    assert.strictEqual(isStoryFile(content), false);
  });

  it('should handle empty content', () => {
    assert.strictEqual(isStoryFile(''), false);
    assert.strictEqual(isStoryFile('   '), false);
  });
});
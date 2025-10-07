const args = process.argv.slice(2);
const map = {
  'examples': '**/*.test.ts',
  'examples/md': 'md-to-project.test.ts',
  'examples/project': 'project-to-md.test.ts'
};
const pat = map[args[0]] || '**/*.test.ts';
const cmdArgs = [require.resolve('mocha/bin/mocha'), '-r', 'ts-node/register', pat];
require('child_process')
  .spawn(process.execPath, cmdArgs, { stdio: 'inherit' })
  .on('exit', code => process.exit(code));
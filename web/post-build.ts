import * as path from 'path';
import * as fs from 'fs';

const currentWorkingDirectory = process.cwd();
const buildDirectory = currentWorkingDirectory + '/dist';
const parentDirectory = path.resolve(currentWorkingDirectory, '..');

function postBuild() {
  if (!currentWorkingDirectory.endsWith('/web')) {
    console.log(`Please run this script in 'diff/web' directory.`);
    return;
  }

  console.log('Copy /dist...');

  if (!fs.existsSync(buildDirectory)) {
    console.log(`'dist' directory could not found. please build 'web'`);
    return;
  }

  fs.cpSync(buildDirectory, parentDirectory + '/built', { recursive: true });

  console.log('Done!');
}

postBuild();

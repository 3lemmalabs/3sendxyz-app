const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MAC_INTERNAL_EXECUTABLE = 'send3';

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appBundleName = `${context.packager.appInfo.productFilename}.app`;
  const appBundlePath = path.join(context.appOutDir, appBundleName);
  const macOsDirPath = path.join(appBundlePath, 'Contents', 'MacOS');
  const currentExecutablePath = path.join(macOsDirPath, context.packager.appInfo.productFilename);
  const renamedExecutablePath = path.join(macOsDirPath, MAC_INTERNAL_EXECUTABLE);

  if (!fs.existsSync(currentExecutablePath)) {
    return;
  }

  if (fs.existsSync(renamedExecutablePath)) {
    fs.rmSync(renamedExecutablePath, { force: true });
  }

  fs.renameSync(currentExecutablePath, renamedExecutablePath);

  const infoPlistPath = path.join(appBundlePath, 'Contents', 'Info.plist');
  execFileSync('/usr/bin/plutil', ['-replace', 'CFBundleExecutable', '-string', MAC_INTERNAL_EXECUTABLE, infoPlistPath]);
};

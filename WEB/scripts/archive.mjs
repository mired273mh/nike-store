import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
const [root, output] = process.argv.slice(2);
if (!root || !output || !fs.existsSync(path.join(root, 'README.md')))
  throw new Error('Missing staged source.');
const zip = new JSZip();
function addDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error('Symbolic links are not allowed in source package.');
    if (entry.isDirectory()) addDirectory(file);
    else zip.file(path.relative(root, file).split(path.sep).join('/'), fs.readFileSync(file));
  }
}
addDirectory(root);
fs.writeFileSync(
  output,
  await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  }),
);
console.log(`Portable ZIP created: ${Object.keys(zip.files).length} entries.`);

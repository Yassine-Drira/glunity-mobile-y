const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\yassi\\.gemini\\antigravity\\brain\\d8710926-f625-4b4f-ae5d-c75b6559dea1\\media__1780226121992.png';
const dest = path.join(__dirname, 'mobile', 'assets', 'Logo', 'tunisia.png');

try {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied tunisia.png to assets!');
} catch (err) {
  console.error('Failed to copy file:', err);
}

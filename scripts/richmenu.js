/*
 Rich Menu management script
 Usage examples:
  - node scripts/richmenu.js list
  - node scripts/richmenu.js delete-all
  - node scripts/richmenu.js deploy --dir richmenus --default bloodPressure
*/
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const line = require('@line/bot-sdk');

const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!accessToken) {
  console.error('Missing env LINE_CHANNEL_ACCESS_TOKEN');
  process.exit(1);
}
const client = new line.Client({ channelAccessToken: accessToken });

const args = process.argv.slice(2);
const cmd = args[0];

function getArg(name, def) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return def;
}

async function list() {
  const menus = await client.getRichMenuList();
  console.log(JSON.stringify(menus, null, 2));
}

async function deleteAll() {
  const menus = await client.getRichMenuList();
  for (const m of menus) {
    await client.deleteRichMenu(m.richMenuId);
    console.log('Deleted', m.name, m.richMenuId);
  }
}

function findImage(dir) {
  const candidates = ['image.png', 'image.jpg', 'image.jpeg'];
  for (const name of candidates) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function createFromDir(dir) {
  const jsonPath = path.join(dir, 'menu.json');
  const imgPath = findImage(dir);
  if (!fs.existsSync(jsonPath)) throw new Error(`Missing ${jsonPath}`);
  if (!imgPath) throw new Error(`Missing image file (image.png|image.jpg) in ${dir}`);

  const menu = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const richMenuId = await client.createRichMenu(menu);
  console.log('Created rich menu', menu.name, richMenuId);

  // Validate image size (< 1MB per LINE spec)
  const stat = fs.statSync(imgPath);
  const max = 1024 * 1024; // 1MB
  if (stat.size > max) {
    throw new Error(`Image too large: ${stat.size} bytes (> 1MB). Please compress below 1MB.`);
  }

  // Detect content type
  const lower = imgPath.toLowerCase();
  const contentType = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const imageStream = fs.createReadStream(imgPath);
  await client.setRichMenuImage(richMenuId, imageStream, contentType);
  console.log('Uploaded image for', richMenuId);
  return { name: menu.name, id: richMenuId };
}

async function deployAll(rootDir, defaultName) {
  const subdirs = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(rootDir, d.name));

  const created = [];
  for (const d of subdirs) {
    const result = await createFromDir(d);
    created.push(result);
  }

  const defaultItem = created.find((c) => c.name === defaultName) || created[0];
  if (defaultItem) {
    await client.setDefaultRichMenu(defaultItem.id);
    console.log('Set default rich menu:', defaultItem.name, defaultItem.id);
  }
}

(async () => {
  try {
    if (cmd === 'list') {
      await list();
    } else if (cmd === 'delete-all') {
      await deleteAll();
    } else if (cmd === 'deploy') {
      const dir = getArg('dir', 'richmenus');
      const def = getArg('default');
      await deployAll(dir, def);
    } else {
      console.log('Commands: list | delete-all | deploy --dir <dir> [--default <name>]');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

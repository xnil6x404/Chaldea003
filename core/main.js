const fs = require('fs');
const path = require('path');
const { install } = require('./system/install');
const { scriptsUtils } = require('./utility/scriptsUtils.js');

// Load JSON files using process.cwd()
const settingsPath = path.join(process.cwd(), 'setup/settings.json');
const vipPath = path.join(process.cwd(), 'setup/vip.json');
const apiPath = path.join(process.cwd(), 'setup/api.json');
const statesPath = path.join(process.cwd(), 'setup/states.json');

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const vip = JSON.parse(fs.readFileSync(vipPath, 'utf8'));
const api = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
const states = JSON.parse(fs.readFileSync(statesPath, 'utf8'));

// Set global variables
global.settings = settings;
global.vip = vip;
global.api = api;
global.states = states;

// Initialize the chaldea object
global.chaldea = {
  commands: new Map(),
  cooldowns: new Map(),
  replies: new Map(),
  callbacks: new Map(),
  events: new Map()
};

global.scripts = scriptsUtils;

scriptsUtils();

// Require and call the login function
const { login } = require('./system/login');
login();
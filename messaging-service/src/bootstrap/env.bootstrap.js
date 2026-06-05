'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file inside this folder
dotenv.config({ path: path.join(__dirname, '../../.env') });

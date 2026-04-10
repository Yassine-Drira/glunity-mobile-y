process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/glunity_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_access_secret';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test_refresh_secret';
process.env.ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
process.env.REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:5000';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8081';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/chatter_test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.CLIENT_URL = 'http://localhost:5173';

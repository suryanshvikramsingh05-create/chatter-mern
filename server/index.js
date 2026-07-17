require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
const io = initSocket(httpServer);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.password).toBeUndefined();
    expect(res.body.email).toBe('alice@example.com');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice2',
      email: 'alice@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'incomplete',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('rejects nonexistent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'whatever',
    });

    expect(res.status).toBe(401);
  });

  it('does not crash or authenticate on a NoSQL injection attempt', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: { $gt: '' },
      password: { $gt: '' },
    });

    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });
});

describe('POST /api/auth/guest', () => {
  it('creates a distinct guest account and returns a token', async () => {
    const res = await request(app).post('/api/auth/guest').send({});

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.isGuest).toBe(true);
    expect(res.body.password).toBeUndefined();
  });

  it('gives each guest a unique account', async () => {
    const first = await request(app).post('/api/auth/guest').send({});
    const second = await request(app).post('/api/auth/guest').send({});

    expect(first.body._id).not.toBe(second.body._id);
    expect(first.body.username).not.toBe(second.body.username);
  });

  it('lets a guest use protected routes immediately', async () => {
    const guest = await request(app).post('/api/auth/guest').send({});

    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${guest.body.token}`);

    expect(res.status).toBe(200);
  });
});

describe('protected routes', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/chats');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await request(app).get('/api/chats').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

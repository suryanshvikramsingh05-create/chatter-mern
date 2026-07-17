const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

let aliceToken, bobToken, carolToken;
let aliceId, bobId, carolId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const alice = await request(app).post('/api/auth/register').send({
    username: 'chat_alice',
    email: 'chat_alice@example.com',
    password: 'secret123',
  });
  const bob = await request(app).post('/api/auth/register').send({
    username: 'chat_bob',
    email: 'chat_bob@example.com',
    password: 'secret123',
  });
  const carol = await request(app).post('/api/auth/register').send({
    username: 'chat_carol',
    email: 'chat_carol@example.com',
    password: 'secret123',
  });

  aliceToken = alice.body.token;
  aliceId = alice.body._id;
  bobToken = bob.body.token;
  bobId = bob.body._id;
  carolToken = carol.body.token;
  carolId = carol.body._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('user search', () => {
  it('finds users by partial username, excluding self', async () => {
    const res = await request(app)
      .get('/api/users?search=chat_bob')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((u) => u.username === 'chat_bob')).toBe(true);
    expect(res.body.some((u) => u.username === 'chat_alice')).toBe(false);
  });

  it('treats regex special characters in the search term as literal text', async () => {
    const res = await request(app)
      .get('/api/users?search=' + encodeURIComponent('.*'))
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe('one-on-one chats', () => {
  let chatId;

  it('creates a chat between two users', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: bobId });

    expect(res.status).toBe(200);
    expect(res.body.isGroupChat).toBe(false);
    expect(res.body.users).toHaveLength(2);
    chatId = res.body._id;
  });

  it('returns the same chat on a second access instead of duplicating it', async () => {
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: bobId });

    expect(res.body._id).toBe(chatId);
  });

  it('sends a message and marks the sender as having read it', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'hello bob', chatId });

    expect(res.status).toBe(201);
    expect(res.body.readBy).toContain(aliceId);
    expect(res.body.readBy).not.toContain(bobId);
  });

  it('marks messages as read when the recipient fetches them', async () => {
    const before = await request(app)
      .get(`/api/messages/${chatId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(before.status).toBe(200);
    expect(Array.isArray(before.body.messages)).toBe(true);

    const after = await request(app)
      .get(`/api/messages/${chatId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    const msg = after.body.messages.find((m) => m.content === 'hello bob');
    expect(msg.readBy).toContain(bobId);
  });

  it('paginates message history', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: `msg ${i}`, chatId });
    }

    const res = await request(app)
      .get(`/api/messages/${chatId}?page=1&limit=2`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.hasMore).toBe(true);
  });

  it('rejects sending a message without content', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ chatId });

    expect(res.status).toBe(400);
  });
});

describe('group chats', () => {
  let groupChatId;

  it('creates a group chat with an admin', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Test Group', userIds: [bobId, carolId] });

    expect(res.status).toBe(201);
    expect(res.body.isGroupChat).toBe(true);
    expect(res.body.users).toHaveLength(3);
    expect(res.body.groupAdmin._id).toBe(aliceId);
    groupChatId = res.body._id;
  });

  it('rejects group creation with fewer than 2 other members', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Too Small', userIds: [bobId] });

    expect(res.status).toBe(400);
  });

  it('lets the admin rename the group', async () => {
    const res = await request(app)
      .put('/api/chats/group/rename')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ chatId: groupChatId, name: 'Renamed Group' });

    expect(res.status).toBe(200);
    expect(res.body.chatName).toBe('Renamed Group');
  });

  it('rejects a non-admin trying to rename the group', async () => {
    const res = await request(app)
      .put('/api/chats/group/rename')
      .set('Authorization', `Bearer ${carolToken}`)
      .send({ chatId: groupChatId, name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('lets the admin remove a member', async () => {
    const res = await request(app)
      .put('/api/chats/group/remove')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ chatId: groupChatId, userId: carolId });

    expect(res.status).toBe(200);
    expect(res.body.users.some((u) => u._id === carolId)).toBe(false);
  });

  it('lets the admin add a member back', async () => {
    const res = await request(app)
      .put('/api/chats/group/add')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ chatId: groupChatId, userId: carolId });

    expect(res.status).toBe(200);
    expect(res.body.users.some((u) => u._id === carolId)).toBe(true);
  });
});

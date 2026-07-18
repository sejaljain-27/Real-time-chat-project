const request = require('supertest');
const createApp = require('../src/app');
const Message = require('../src/models/Message');

const app = createApp('http://localhost:5173');

async function registerAndLogin(username) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@example.com`, password: 'password123' });
  return { token: res.body.token, user: res.body.user };
}

describe('Room endpoints', () => {
  it('requires auth to list or create rooms', async () => {
    const listRes = await request(app).get('/api/rooms');
    expect(listRes.status).toBe(401);

    const createRes = await request(app).post('/api/rooms').send({ name: 'general' });
    expect(createRes.status).toBe(401);
  });

  it('creates a room and lists it', async () => {
    const { token } = await registerAndLogin('roomCreator');

    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'General Chat' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.room.name).toBe('general chat'); // lowercased

    const listRes = await request(app).get('/api/rooms').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.rooms).toHaveLength(1);
  });

  it('rejects duplicate room names', async () => {
    const { token } = await registerAndLogin('dupRoomUser');

    await request(app).post('/api/rooms').set('Authorization', `Bearer ${token}`).send({ name: 'dev-talk' });

    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'dev-talk' });

    expect(res.status).toBe(409);
  });

  it('returns paginated message history oldest-first', async () => {
    const { token, user } = await registerAndLogin('historyUser');
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'history-room' });

    const roomId = createRes.body.room._id;

    // Seed a few messages directly (bypassing sockets, which is fine —
    // this test only exercises the REST history endpoint).
    for (let i = 0; i < 3; i += 1) {
      await Message.create({
        room: roomId,
        sender: user.id,
        senderUsername: user.username,
        text: `message ${i}`,
      });
    }

    const res = await request(app)
      .get(`/api/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.messages[0].text).toBe('message 0');
    expect(res.body.messages[2].text).toBe('message 2');
  });
});

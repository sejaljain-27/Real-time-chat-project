const request = require('supertest');
const createApp = require('../src/app');

const app = createApp('http://localhost:5173');

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'bob',
      email: 'dup@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      username: 'bob2',
      email: 'dup@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'shortpw',
      email: 'shortpw@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'carol',
      email: 'carol@example.com',
      password: 'correct-password',
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'carol@example.com',
      password: 'correct-password',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'carol@example.com',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      username: 'dave',
      email: 'dave@example.com',
      password: 'password123',
    });
    const token = registerRes.body.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('dave@example.com');
  });
});

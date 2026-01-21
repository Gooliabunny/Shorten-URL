import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';
import { unlink } from 'fs/promises';

// Create test app
const createTestApp = () => {
    const app = express();
    const db = new Database(':memory:'); // Use in-memory database for tests

    db.exec(`
        CREATE TABLE IF NOT EXISTS urls (
            short TEXT PRIMARY KEY,
            original TEXT NOT NULL UNIQUE
        )
    `);

    const cache = new Map();

    const loadCache = () => {
        const allUrls = db.prepare('SELECT short, original FROM urls').all();
        allUrls.forEach(row => {
            cache.set(row.short, row.original);
        });
    };

    loadCache();

    app.use(cors());
    app.use(express.json());

    app.post('/', (req, res) => {
        try {
            const cachedShort = [...cache.entries()].find(([short, url]) => url === req.body.value)?.[0];
            
            if (cachedShort) {
                return res.json(cachedShort);
            }
            
            const existing = db.prepare('SELECT short FROM urls WHERE original = ?').get(req.body.value);
            
            if (!existing) {
                const short = nanoid(6);
                db.prepare('INSERT INTO urls (short, original) VALUES (?, ?)').run(short, req.body.value);
                cache.set(short, req.body.value);
                res.json(short);
            } else {
                cache.set(existing.short, req.body.value);
                res.json(existing.short);
            }
        } catch (error) {
            res.status(500).json({ error: 'Database error' });
        }
    });

    app.get('/:short', (req, res) => {
        try {
            if (cache.has(req.params.short)) {
                const url = cache.get(req.params.short);
                
                if (!/^https?:\/\//i.test(url)) {
                    return res.redirect(`https://${url}`);
                }
                return res.redirect(url);
            }
            
            const result = db.prepare('SELECT original FROM urls WHERE short = ?').get(req.params.short);
            
            if (!result) {
                return res.status(404).json('Not Found!');
            }
            
            cache.set(req.params.short, result.original);
            
            if (!/^https?:\/\//i.test(result.original)) {
                return res.redirect(`https://${result.original}`);
            }
            
            res.redirect(result.original);
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return { app, db };
};

describe('URL Shortener API', () => {
    let app, db;

    beforeEach(() => {
        const testApp = createTestApp();
        app = testApp.app;
        db = testApp.db;
    });

    afterEach(() => {
        db.close();
    });

    describe('POST /', () => {
        test('should create a short URL', async () => {
            const response = await request(app)
                .post('/')
                .send({ value: 'https://google.com' })
                .expect(200);

            expect(response.body).toHaveLength(6);
            expect(typeof response.body).toBe('string');
        });

        test('should return same short URL for duplicate original URL', async () => {
            const firstResponse = await request(app)
                .post('/')
                .send({ value: 'https://example.com' })
                .expect(200);

            const secondResponse = await request(app)
                .post('/')
                .send({ value: 'https://example.com' })
                .expect(200);

            expect(firstResponse.body).toBe(secondResponse.body);
        });

        test('should create different short URLs for different original URLs', async () => {
            const firstResponse = await request(app)
                .post('/')
                .send({ value: 'https://google.com' });

            const secondResponse = await request(app)
                .post('/')
                .send({ value: 'https://github.com' });

            expect(firstResponse.body).not.toBe(secondResponse.body);
        });
    });

    describe('GET /:short', () => {
        test('should redirect to original URL', async () => {
            const createResponse = await request(app)
                .post('/')
                .send({ value: 'https://google.com' });

            const shortCode = createResponse.body;

            const response = await request(app)
                .get(`/${shortCode}`)
                .expect(302);

            expect(response.headers.location).toBe('https://google.com');
        });

        test('should add https:// to URLs without protocol', async () => {
            const createResponse = await request(app)
                .post('/')
                .send({ value: 'google.com' });

            const shortCode = createResponse.body;

            const response = await request(app)
                .get(`/${shortCode}`)
                .expect(302);

            expect(response.headers.location).toBe('https://google.com');
        });

        test('should return 404 for non-existent short URL', async () => {
            await request(app)
                .get('/nonexistent')
                .expect(404);
        });
    });

    describe('Database and Cache', () => {
        test('should persist data in database', async () => {
            const response = await request(app)
                .post('/')
                .send({ value: 'https://test.com' });

            const shortCode = response.body;

            const result = db.prepare('SELECT original FROM urls WHERE short = ?').get(shortCode);
            expect(result.original).toBe('https://test.com');
        });

        test('should use cache for faster lookups', async () => {
            const createResponse = await request(app)
                .post('/')
                .send({ value: 'https://cached.com' });

            const shortCode = createResponse.body;

            // First request (cache should be populated)
            await request(app).get(`/${shortCode}`);

            // Second request should use cache
            const response = await request(app)
                .get(`/${shortCode}`)
                .expect(302);

            expect(response.headers.location).toBe('https://cached.com');
        });
    });
});
import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';

const port = 8000;
const app = express();

// Database for persistence
const db = new Database('urls.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
        short TEXT PRIMARY KEY,
        original TEXT NOT NULL UNIQUE
    )
`);

// In-memory cache for O(1) lookups
const cache = new Map();

// Load all existing URLs into cache on startup
const loadCache = () => {
    const allUrls = db.prepare('SELECT short, original FROM urls').all();
    allUrls.forEach(row => {
        cache.set(row.short, row.original);
    });
    console.log(`Loaded ${cache.size} URLs into cache`);
};

loadCache(); // Initialize cache

app.use(cors());
app.use(express.json());

app.post('/', (req, res) => {
    try {
        // Check cache first - O(1)
        const cachedShort = [...cache.entries()].find(([short, url]) => url === req.body.value)?.[0];
        
        if (cachedShort) {
            return res.json(cachedShort);
        }
        
        // Not in cache, check database
        const existing = db.prepare('SELECT short FROM urls WHERE original = ?').get(req.body.value);
        
        if (!existing) {
            const short = nanoid(6);
            db.prepare('INSERT INTO urls (short, original) VALUES (?, ?)').run(short, req.body.value);
            
            // Add to cache immediately
            cache.set(short, req.body.value);
            
            res.json(short);
        } else {
            // Add to cache for future
            cache.set(existing.short, req.body.value);
            res.json(existing.short);
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/:short', (req, res) => {
    try {
        // Check cache - O(1)
        if (cache.has(req.params.short)) {
            const url = cache.get(req.params.short);
            
            if (!/^https?:\/\//i.test(url)) {
                return res.redirect(`https://${url}`);
            }
            return res.redirect(url);
        }
        
        // Not in cache (shouldn't happen if loadCache works), check database
        const result = db.prepare('SELECT original FROM urls WHERE short = ?').get(req.params.short);
        
        if (!result) {
            return res.status(404).json('Not Found!');
        }
        
        // Add to cache for next time
        cache.set(req.params.short, result.original);
        
        if (!/^https?:\/\//i.test(result.original)) {
            return res.redirect(`https://${result.original}`);
        }
        
        res.redirect(result.original);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
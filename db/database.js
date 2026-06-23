const knex = require('knex');
const path = require('path');
const fs = require('fs');

const client = process.env.DB_CLIENT || 'sqlite3';

let db;

if (client === 'pg') {
    db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: { min: 2, max: 10 }
    });
} else {
    // Default to better-sqlite3 for local SQLite
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'database.sqlite');
    
    db = knex({
        client: 'better-sqlite3',
        connection: {
            filename: dbPath
        },
        useNullAsDefault: true
    });
}

// Async function to initialize schema
async function initDb() {
    try {
        const hasUsers = await db.schema.hasTable('users');
        if (!hasUsers) {
            await db.schema.createTable('users', (table) => {
                table.increments('id').primary();
                table.string('username').unique().notNullable();
                table.string('password_hash').notNullable();
                table.string('encryption_salt').notNullable();
                table.timestamp('created_at').defaultTo(db.fn.now());
            });
        }

        const hasEntries = await db.schema.hasTable('entries');
        if (!hasEntries) {
            await db.schema.createTable('entries', (table) => {
                table.increments('id').primary();
                table.integer('user_id').unsigned().notNullable()
                     .references('id').inTable('users').onDelete('CASCADE');
                table.string('service_name').notNullable();
                table.string('username').defaultTo('');
                table.string('secret_encrypted').notNullable();
                table.string('iv').notNullable();
                table.string('icon').defaultTo('');
                table.timestamp('deleted_at').nullable().defaultTo(null);
                table.timestamp('created_at').defaultTo(db.fn.now());
                table.timestamp('updated_at').defaultTo(db.fn.now());
            });
        }
        console.log(`Database initialized using client: ${client === 'pg' ? 'PostgreSQL' : 'SQLite'}`);
    } catch (err) {
        console.error('Failed to initialize database schema:', err);
    }
}

// Call init on startup
initDb();

module.exports = db;

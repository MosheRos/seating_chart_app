import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

export async function getDb() {
    if (db) return db;

    db = await open({
        filename: './seating.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY,
            firstName TEXT,
            lastName TEXT,
            displayName TEXT,
            roomId TEXT,
            createdAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS layouts (
            year INTEGER PRIMARY KEY,
            items TEXT, -- JSON
            tables TEXT, -- JSON
            columns TEXT, -- JSON
            updatedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS seat_assignments (
            year INTEGER,
            seatLabel TEXT,
            memberId TEXT,
            PRIMARY KEY (year, seatLabel),
            FOREIGN KEY (memberId) REFERENCES members(id)
        );
    `);

    return db;
}

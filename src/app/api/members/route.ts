export const dynamic = 'force-dynamic'; // Ensure no caching

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Member } from '@/lib/types';

// GET all members
export async function GET() {
    try {
        const db = await getDb();
        const members = await db.all('SELECT * FROM members ORDER BY displayName ASC');
        return NextResponse.json(members);
    } catch (error) {
        console.error("Failed to fetch members:", error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

// POST new member(s)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const db = await getDb();

        // Handle single or batch insert
        const members: Member[] = Array.isArray(body) ? body : [body];

        for (const m of members) {
            await db.run(
                `INSERT OR REPLACE INTO members (id, firstName, lastName, displayName, roomId, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [m.id, m.firstName, m.lastName, m.displayName, m.roomId, Date.now()]
            );
        }

        return NextResponse.json({ success: true, count: members.length });
    } catch (error) {
        console.error("Failed to save members:", error);
        return NextResponse.json({ error: "Failed to save members" }, { status: 500 });
    }
}

// PUT update member
export async function PUT(req: Request) {
    try {
        const member = await req.json();
        const db = await getDb();

        await db.run(
            `UPDATE members SET firstName = ?, lastName = ?, displayName = ?, roomId = ? WHERE id = ?`,
            [member.firstName, member.lastName, member.displayName, member.roomId, member.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update member:", error);
        return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
    }
}

// DELETE member
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const db = await getDb();
        await db.run('DELETE FROM members WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete member:", error);
        return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
    }
}

import { promises as fs } from "fs";
import path from "path";
import { Member, LayoutItem, Table, ColumnConfig } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const MEMBERS_FILE = path.join(DATA_DIR, "members.json");
const LAYOUTS_FILE = path.join(DATA_DIR, "layouts.json");

async function ensureDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch {
        // ignore
    }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
    try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
    await ensureDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Members
export async function getMembers(): Promise<Member[]> {
    return readJson<Member[]>(MEMBERS_FILE, []);
}

export async function setMembers(members: Member[]): Promise<void> {
    await writeJson(MEMBERS_FILE, members);
}

export async function addOrUpdateMember(member: Member): Promise<void> {
    const members = await getMembers();
    const idx = members.findIndex((m) => m.id === member.id);
    if (idx >= 0) members[idx] = member;
    else members.push(member);
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));
    await setMembers(members);
}

export async function deleteMember(id: string): Promise<void> {
    const members = await getMembers();
    await setMembers(members.filter((m) => m.id !== id));
}

// Layouts: { [year: number]: { items, tables, columns } }
type LayoutData = {
    items: LayoutItem[];
    tables: Table[];
    columns: ColumnConfig[];
};

type LayoutsMap = Record<string, LayoutData>;

export async function getLayout(year: number): Promise<LayoutData | null> {
    const layouts = await readJson<LayoutsMap>(LAYOUTS_FILE, {});
    const key = String(year);
    return layouts[key] ?? null;
}

export async function saveLayout(
    year: number,
    items: LayoutItem[],
    tables: Table[],
    columns: ColumnConfig[]
): Promise<void> {
    const layouts = await readJson<LayoutsMap>(LAYOUTS_FILE, {});
    layouts[String(year)] = { items, tables, columns };
    await writeJson(LAYOUTS_FILE, layouts);
}

// History: derived from layouts + members
export async function getHistoryRows(memberId?: string): Promise<
    Array<{ year: number; seatLabel: string; memberId?: string; displayName?: string }>
> {
    const layouts = await readJson<LayoutsMap>(LAYOUTS_FILE, {});
    const members = await getMembers();
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const rows: Array<{ year: number; seatLabel: string; memberId?: string; displayName?: string }> = [];

    for (const [yearStr, layout] of Object.entries(layouts)) {
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || !layout?.items) continue;
        for (const item of layout.items) {
            if (item.type !== "seat" || !item.memberId) continue;
            if (memberId && item.memberId !== memberId) continue;
            const member = memberMap.get(item.memberId);
            rows.push({
                year,
                seatLabel: item.label,
                memberId: item.memberId,
                displayName: member?.displayName,
            });
        }
    }

    rows.sort((a, b) => b.year - a.year);
    return rows;
}

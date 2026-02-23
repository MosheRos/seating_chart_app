import { LayoutItem, HistoryMap, Member, Table } from "./types";

export const STORAGE_KEYS = {
    MEMBERS: "seating_app_members",
    LAYOUT: (year: number) => `seating_app_layout_${year}`,
    TABLES: (year: number) => `seating_app_tables_${year}`,
};

/**
 * Scans localStorage for all years and builds a history map keyed by seat label.
 */
export function getGlobalHistory(members: Member[]): HistoryMap {
    const history: HistoryMap = {};

    if (typeof window === "undefined") return history;

    // Find all layout keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith("seating_app_layout_"));

    keys.forEach(key => {
        const yearStr = key.replace("seating_app_layout_", "");
        const year = parseInt(yearStr);
        if (isNaN(year)) return;

        try {
            const items = JSON.parse(localStorage.getItem(key) || "[]") as LayoutItem[];
            items.forEach(item => {
                if (item.type === "seat" && item.memberId) {
                    const member = members.find(m => m.id === item.memberId);
                    if (member) {
                        if (!history[item.label]) history[item.label] = [];
                        history[item.label].push({
                            year,
                            displayName: member.displayName
                        });
                    }
                }
            });
        } catch (e) {
            console.warn(`Failed to parse history for year ${year}`, e);
        }
    });

    return history;
}

/**
 * Aggregates a single member's history across all years.
 */
export function getMemberHistory(memberId: string): Array<{ year: number; seatLabel: string }> {
    const history: Array<{ year: number; seatLabel: string }> = [];
    if (typeof window === "undefined") return history;

    const keys = Object.keys(localStorage).filter(k => k.startsWith("seating_app_layout_"));

    keys.forEach(key => {
        const year = parseInt(key.replace("seating_app_layout_", ""));
        try {
            const items = JSON.parse(localStorage.getItem(key) || "[]") as LayoutItem[];
            const assignedSeat = items.find(it => it.memberId === memberId);
            if (assignedSeat) {
                history.push({ year, seatLabel: assignedSeat.label });
            }
        } catch (e) { /* skip */ }
    });

    return history.sort((a, b) => b.year - a.year);
}

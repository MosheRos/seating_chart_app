export type LayoutItemType = "seat" | "object";

export interface LayoutItem {
    id: string;
    type: LayoutItemType;
    label: string;
    x: number;
    y: number;
    roomId: string;
    memberId?: string;
    tableId?: string; // Grouping seats into tables
    columnId?: string;
    selected?: boolean;
}

export interface Table {
    id: string;
    label: string;
    x: number;
    y: number;
    roomId: string;
    columnId: string;
    seatIds: string[];
}

export interface Member {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    roomId: string;
}

export interface ColumnConfig {
    id: string;
    seatsPerTable: number;
    xOffset: number; // For dynamic spacing
}

export interface Room {
    id: string;
    name: string;
}

export interface YearData {
    year: number;
    items: LayoutItem[];
    tables?: Table[];
    columns?: ColumnConfig[];
}

export type HistoryMap = Record<string, Array<{ year: number; displayName: string }>>;
export type MemberHistory = Record<string, Array<{ year: number; seatLabel: string }>>;

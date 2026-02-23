import { Member, Room, YearData } from "./types";

export const ROOMS: Room[] = [
    { id: "main", name: "Main Room" },
    { id: "side", name: "Side Room" },
];

export const MOCK_MEMBERS: Member[] = [
    { id: "1", firstName: "Yisrael", lastName: "Yisraeli", displayName: "ישראל י.", roomId: "main" },
    { id: "2", firstName: "Moshe", lastName: "Cohen", displayName: "משה כ.", roomId: "main" },
    { id: "3", firstName: "David", lastName: "Levi", displayName: "דוד ל.", roomId: "side" },
    { id: "4", firstName: "Sarah", lastName: "Avraham", displayName: "שרה א.", roomId: "side" },
];

export const MOCK_YEARS: YearData[] = [
    {
        year: 2024,
        items: [
            { id: "s1", type: "seat", label: "COL1 - S1", x: 100, y: 144, roomId: "main", memberId: "1" },
            { id: "s2", type: "seat", label: "COL2 - S1", x: 484, y: 144, roomId: "main", memberId: "2" },
            { id: "o1", type: "object", label: "Door", x: 50, y: 50, roomId: "main" },
        ],
    },
];

"use client";

import { useState } from "react";
import { Member, Room, ColumnConfig } from "@/lib/types";
import { MemberCard } from "./MemberCard";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

interface SidebarProps {
    members: Member[];
    rooms: Room[];
    onRoomChange: (roomId: string) => void;
    selectedRoomId: string;
    columnConfigs?: ColumnConfig[];
    onUpdateColumnSeats?: (id: string, seats: number) => void;
}

export function Sidebar({ members, rooms, onRoomChange, selectedRoomId, columnConfigs, onUpdateColumnSeats }: SidebarProps) {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"members" | "columns">("members");
    const { isOver, setNodeRef } = useDroppable({
        id: "sidebar-dropzone",
    });

    const filteredMembers = members.filter(
        (m) =>
            m.roomId === selectedRoomId &&
            (m.displayName.includes(search) ||
                m.firstName.toLowerCase().includes(search.toLowerCase()) ||
                m.lastName.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-80 h-full glass border-r flex flex-col p-4 gap-4 overflow-hidden border-l-0 transition-colors",
                isOver && "bg-blue-50/50 ring-2 ring-blue-500/20 ring-inset"
            )}
        >
            <div className="flex flex-col gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("members")}
                        className={cn("flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === "members" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab("columns")}
                        className={cn("flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === "columns" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        Columns
                    </button>
                </div>

                {activeTab === "members" ? (
                    <>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search member..."
                                className="w-full bg-slate-100/50 border-none rounded-xl py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    onClick={() => onRoomChange(room.id)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                        selectedRoomId === room.id
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-200/50 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    {room.name}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Column Settings</h3>
                        <div className="space-y-2">
                            {columnConfigs?.map(col => (
                                <div key={col.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700 uppercase">{col.id}</span>
                                        <span className="text-[10px] text-slate-400 font-mono italic">{col.seatsPerTable} seats/table</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={col.seatsPerTable}
                                        onChange={(e) => onUpdateColumnSeats?.(col.id, parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {activeTab === "members" && (
                    filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => (
                            <MemberCard key={member.id} member={member} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            {isOver ? "Drop here to release" : "No unseated members found"}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

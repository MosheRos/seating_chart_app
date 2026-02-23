"use client";

import { useDroppable } from "@dnd-kit/core";
import { Seat, Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface SeatProps {
    seat: Seat;
    occupant?: Member;
    history?: Array<{ year: number; displayName: string }>;
}

export function SeatComponent({ seat, occupant, history }: SeatProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: `seat-${seat.id}`,
        data: seat,
    });

    return (
        <div
            ref={setNodeRef}
            style={{ left: `${seat.x}px`, top: `${seat.y}px` }}
            className={cn(
                "absolute w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group",
                "border-2",
                isOver
                    ? "border-blue-500 bg-blue-50/50 scale-105"
                    : occupant
                        ? "border-slate-300 bg-white shadow-sm"
                        : "border-dashed border-slate-300 bg-slate-50/50 hover:border-slate-400"
            )}
        >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-white text-[10px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {seat.label}
            </div>

            {occupant ? (
                <div className="flex flex-col items-center text-center p-2">
                    <User className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-sm font-bold text-slate-800 leading-tight">
                        {occupant.displayName}
                    </span>
                </div>
            ) : (
                <span className="text-xs text-slate-400">פנוי</span>
            )}

            {/* History Tooltip */}
            {history && history.length > 0 && (
                <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col glass p-3 rounded-xl min-w-[150px] z-50 pointer-events-none">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">היסטוריית מושב</h4>
                    <div className="flex flex-col gap-1.5">
                        {history.map((h, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">{h.year}</span>
                                <span className="font-medium text-slate-800">{h.displayName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

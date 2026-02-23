"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { Sidebar } from "@/components/Sidebar";
import { LayoutEditor } from "@/components/LayoutEditor";
import { MemberCard } from "@/components/MemberCard";
import { Member, LayoutItem, Room, HistoryMap, ColumnConfig, Table } from "@/lib/types";
import { ROOMS } from "@/lib/mock-data";
import { Users, Settings, Plus, LayoutGrid, FileText, Grid3X3, Trash2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PdfUploader } from "@/components/PdfUploader";
import { cn } from "@/lib/utils";
import { getGlobalHistory, STORAGE_KEYS } from "@/lib/storage-utils";

const GRID_SIZE = 24;

export default function Home() {
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("main");
  const [currentYear, setCurrentYear] = useState<number>(2025);

  const [items, setItems] = useState<LayoutItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([
    { id: "col1", seatsPerTable: 2, xOffset: 100 },
    { id: "col2", seatsPerTable: 3, xOffset: 484 }, // 100 + (2 * 100) + 184 gap
  ]);

  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [historyMap, setHistoryMap] = useState<HistoryMap>({});

  // Helper to calculate next column start
  const getNextX = (configs: ColumnConfig[]) => {
    if (configs.length === 0) return 100;
    const last = configs[configs.length - 1];
    return snap(last.xOffset + (last.seatsPerTable * 100) + 184);
  };

  const loadLayout = () => {
    const savedLayout = localStorage.getItem(STORAGE_KEYS.LAYOUT(currentYear));
    const savedTables = localStorage.getItem(STORAGE_KEYS.TABLES(currentYear));
    const savedCols = localStorage.getItem(`seating_app_cols_${currentYear}`);

    if (savedLayout) setItems(JSON.parse(savedLayout));
    else setItems([]);

    if (savedTables) setTables(JSON.parse(savedTables));
    else setTables([]);

    if (savedCols) setColumnConfigs(JSON.parse(savedCols));
    else setColumnConfigs([
      { id: "col1", seatsPerTable: 2, xOffset: 100 },
      { id: "col2", seatsPerTable: 3, xOffset: 484 }
    ]);
  };
  // Load members from API
  const loadMembers = async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) setMembers(await res.json());
    } catch (e) { console.error(e); }
  };

  // Load history map from API
  const loadHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data: Array<{ year: number, seatLabel: string, displayName: string }> = await res.json();
        const map: HistoryMap = {};
        data.forEach(h => {
          if (!map[h.seatLabel]) map[h.seatLabel] = [];
          map[h.seatLabel].push({ year: h.year, displayName: h.displayName });
        });
        setHistoryMap(map);
      }
    } catch (e) { console.error(e); }
  };

  // Track year so we skip persisting once when year changes (until loadLayout state is applied)
  const previousYearRef = useRef<number | null>(null);

  useEffect(() => {
    loadMembers();
    loadLayout();
    loadHistory();
  }, [currentYear]);

  // Persist layout to localStorage when items/tables/columnConfigs change (skip first run after year change)
  useEffect(() => {
    if (previousYearRef.current !== currentYear) {
      previousYearRef.current = currentYear;
      return;
    }
    localStorage.setItem(STORAGE_KEYS.LAYOUT(currentYear), JSON.stringify(items));
    localStorage.setItem(STORAGE_KEYS.TABLES(currentYear), JSON.stringify(tables));
    localStorage.setItem(`seating_app_cols_${currentYear}`, JSON.stringify(columnConfigs));
  }, [currentYear, items, tables, columnConfigs]);




  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));


  const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string, multi: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveMember(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    if (!activeData) return;

    if (over.id === "sidebar-dropzone") {
      if ("memberId" in activeData) {
        const item = activeData as unknown as LayoutItem;
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, memberId: undefined } : it));
      }
      return;
    }

    if (over.id.toString().startsWith("seat-")) {
      const targetId = over.id.toString().replace("seat-", "");
      if ("displayName" in activeData) {
        const member = activeData as unknown as Member;
        setItems(prev => prev.map(it => it.id === targetId ? { ...it, memberId: member.id } : (it.memberId === member.id ? { ...it, memberId: undefined } : it)));
      } else if ("memberId" in activeData) {
        const sourceItem = activeData as unknown as LayoutItem;
        if (!sourceItem.memberId) return;
        setItems(prev => {
          const target = prev.find(i => i.id === targetId);
          return prev.map(it => it.id === targetId ? { ...it, memberId: sourceItem.memberId } : (it.id === sourceItem.id ? { ...it, memberId: target?.memberId } : it));
        });
      }
    }

    if (over.id === "layout-editor") {
      const { x, y } = event.delta;
      const dX = snap(x);
      const dY = snap(y);

      if ("seatIds" in activeData) {
        const table = activeData as unknown as Table;
        // If the table is selected, move ALL selected tables
        const targets = selectedIds.has(table.id) ? tables.filter(t => selectedIds.has(t.id)) : [table];
        const targetIds = targets.map(t => t.id);
        const seatIds = targets.flatMap(t => t.seatIds);

        setTables(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, x: t.x + dX, y: t.y + dY } : t));
        setItems(prev => prev.map(it => seatIds.includes(it.id) ? { ...it, x: it.x + dX, y: it.y + dY } : it));
      } else if ("id" in activeData) {
        const item = activeData as unknown as LayoutItem;
        const targets = selectedIds.has(item.id) ? items.filter(i => selectedIds.has(i.id)) : [item];
        const targetIds = targets.map(i => i.id);
        setItems(prev => prev.map(i => targetIds.includes(i.id) ? { ...i, x: i.x + dX, y: i.y + dY } : i));
      }
    }
  };

  const addRow = () => {
    const lY = items.length > 0 || tables.length > 0 ? Math.max(...items.map(i => i.y), ...tables.map(t => t.y)) : 100;
    const nY = snap(lY + 144);
    const nTs: Table[] = [];
    const nSs: LayoutItem[] = [];

    columnConfigs.forEach((col, idx) => {
      const tId = `table-${Date.now()}-${idx}`;
      const sIds: string[] = [];
      const tX = snap(col.xOffset);
      const tSs: LayoutItem[] = Array.from({ length: col.seatsPerTable }).map((_, si) => {
        const sId = `seat-${tId}-${si}`;
        sIds.push(sId);
        return {
          id: sId,
          type: "seat" as const,
          label: `${col.id.toUpperCase()} - S${si + 1}`,
          x: tX + (si * 100),
          y: nY + 44,
          roomId: activeRoomId,
          tableId: tId,
          columnId: col.id
        };
      });
      nTs.push({
        id: tId,
        label: `Row ${Math.floor(nY / 144) + 1} - ${col.id.toUpperCase()}`,
        x: tX,
        y: nY,
        roomId: activeRoomId,
        columnId: col.id,
        seatIds: sIds
      });
      nSs.push(...tSs);
    });
    setTables(prev => [...prev, ...nTs]);
    setItems(prev => [...prev, ...nSs]);
  };

  const addColumn = () => {
    const cCount = prompt("Seats per table for this column?", "2") || "2";
    const seats = parseInt(cCount);
    if (isNaN(seats)) return;

    const newColId = `col${columnConfigs.length + 1}`;
    const newXOffset = getNextX(columnConfigs);
    const newCol: ColumnConfig = { id: newColId, seatsPerTable: seats, xOffset: newXOffset };

    setColumnConfigs(prev => [...prev, newCol]);

    // Retroactively add tables for the new column
    const existingYs = Array.from(new Set([...items.map(i => i.y), ...tables.map(t => t.y)]));
    const finalYs = existingYs.length > 0 ? existingYs.map(y => y - (y % 144)) : [144];
    const uniqueYs = Array.from(new Set(finalYs));

    const nTs: Table[] = [];
    const nSs: LayoutItem[] = [];

    uniqueYs.forEach((tableY, idx) => {
      const tableId = `table-${Date.now()}-${newColId}-${idx}`;
      const sIds: string[] = [];

      const tableSeats: LayoutItem[] = Array.from({ length: seats }).map((_, si) => {
        const sId = `seat-${tableId}-${si}`;
        sIds.push(sId);
        return {
          id: sId,
          type: "seat" as const,
          label: `${newColId.toUpperCase()} - S${si + 1}`,
          x: newXOffset + (si * 100),
          y: tableY + 44,
          roomId: activeRoomId,
          tableId: tableId,
          columnId: newColId
        };
      });

      nTs.push({
        id: tableId,
        label: `Row ${Math.floor(tableY / 144) + 1} - ${newColId.toUpperCase()}`,
        x: newXOffset,
        y: tableY,
        roomId: activeRoomId,
        columnId: newColId,
        seatIds: sIds
      });

      nSs.push(...tableSeats);
    });

    setTables(prev => [...prev, ...nTs]);
    setItems(prev => [...prev, ...nSs]);
  };

  const addObj = () => setItems([...items, { id: `obj-${Date.now()}`, type: "object", label: "Object", x: snap(50), y: snap(50), roomId: activeRoomId }]);

  const moveRow = (rowY: number, deltaY: number) => {
    const rowTables = tables.filter(t => Math.abs(t.y - rowY) < 10);
    const seatIds = rowTables.flatMap(t => t.seatIds);

    setTables(prev => prev.map(t => Math.abs(t.y - rowY) < 10 ? { ...t, y: snap(t.y + deltaY) } : t));
    setItems(prev => prev.map(it => seatIds.includes(it.id) ? { ...it, y: snap(it.y + deltaY) } : it));
  };

  const moveColumn = (columnId: string, deltaX: number) => {
    const colTables = tables.filter(t => t.columnId === columnId);
    const seatIds = colTables.flatMap(t => t.seatIds);

    // Update the config too so future rows follow
    setColumnConfigs(prev => prev.map(c => c.id === columnId ? { ...c, xOffset: snap(c.xOffset + deltaX) } : c));

    setTables(prev => prev.map(t => t.columnId === columnId ? { ...t, x: snap(t.x + deltaX) } : t));
    setItems(prev => prev.map(it => seatIds.includes(it.id) ? { ...it, x: snap(it.x + deltaX) } : it));
  };

  const clear = () => {
    if (confirm("Clear layout for this year?")) {
      setItems([]); setTables([]);
      setColumnConfigs([{ id: "col1", seatsPerTable: 2, xOffset: 100 }, { id: "col2", seatsPerTable: 3, xOffset: 484 }]);
      localStorage.removeItem(`seating_app_layout_${currentYear}`);
      localStorage.removeItem(`seating_app_tables_${currentYear}`);
      localStorage.removeItem(`seating_app_cols_${currentYear}`);
    }
  };

  const updateItemLabel = (id: string, label: string) => setItems(prev => prev.map(it => it.id === id ? { ...it, label } : it));
  const deleteItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const handleAssignPdfResults = (lines: string[]) => {
    // PDF lines are in "Name | Name | Name" format from our spatial parser
    // We try to match them to the current grid (Row X, Col Y)
    const newItems = [...items];

    // Sort tables by Y then X to get a grid order
    const gridTables = [...tables].sort((a, b) => a.y - b.y || a.x - b.x);

    // Group into rows
    const tableRows: Table[][] = [];
    gridTables.forEach(t => {
      const row = tableRows.find(r => Math.abs(r[0].y - t.y) < 20);
      if (row) row.push(t);
      else tableRows.push([t]);
    });

    tableRows.forEach((row, ri) => {
      if (ri >= lines.length) return;
      const pdfCells = lines[ri].split("|").map(s => s.trim());
      row.sort((a, b) => a.x - b.x).forEach((table, ci) => {
        if (ci >= pdfCells.length) return;
        const cellText = pdfCells[ci];
        // Try to find a member by display name (simple fuzzy)
        const member = members.find(m => m.displayName.toLowerCase().includes(cellText.toLowerCase()) || cellText.toLowerCase().includes(m.displayName.toLowerCase()));
        if (member) {
          // Assign to the first seat in the table for now, or distribute
          const sId = table.seatIds[0];
          const idx = newItems.findIndex(it => it.id === sId);
          if (idx !== -1) newItems[idx].memberId = member.id;
        }
      });
    });

    setItems(newItems);
    setShowPdfUploader(false);
  };

  const deleteTable = (tableId: string) => {
    if (confirm("Delete this table and its seats?")) {
      const table = tables.find(t => t.id === tableId);
      if (!table) return;
      setTables(prev => prev.filter(t => t.id !== tableId));
      setItems(prev => prev.filter(it => !table.seatIds.includes(it.id)));
    }
  };

  const updateColumnSeats = (columnId: string, seats: number) => {
    const targetIdx = columnConfigs.findIndex(c => c.id === columnId);
    if (targetIdx === -1) return;

    const newConfigs = [...columnConfigs];
    newConfigs[targetIdx] = { ...newConfigs[targetIdx], seatsPerTable: seats };

    for (let i = targetIdx + 1; i < newConfigs.length; i++) {
      const prevCol = newConfigs[i - 1];
      newConfigs[i] = { ...newConfigs[i], xOffset: snap(prevCol.xOffset + (prevCol.seatsPerTable * 100) + 184) };
    }

    const newTables: Table[] = [];
    const itemsToRemove = new Set<string>();
    const newSeats: LayoutItem[] = [];
    const tableDx = new Map<string, number>();

    tables.forEach(table => {
      const config = newConfigs.find(c => c.id === table.columnId);
      if (!config) {
        newTables.push(table);
        return;
      }
      const tableX = config.xOffset;
      const dX = tableX - table.x;
      if (dX !== 0) tableDx.set(table.id, dX);

      if (table.columnId === columnId) {
        const oldIds = table.seatIds;
        const newSeatIds = Array.from({ length: seats }).map((_, i) => `seat-${table.id}-${i}`);
        oldIds.forEach(id => itemsToRemove.add(id));
        newSeatIds.forEach((sId, si) => {
          newSeats.push({
            id: sId,
            type: "seat",
            label: `${columnId.toUpperCase()} - S${si + 1}`,
            x: tableX + (si * 100),
            y: table.y + 44,
            roomId: activeRoomId,
            tableId: table.id,
            columnId: columnId
          });
        });
        newTables.push({ ...table, x: tableX, seatIds: newSeatIds });
      } else {
        newTables.push({ ...table, x: tableX });
      }
    });

    setColumnConfigs(newConfigs);
    setTables(newTables);
    setItems(prev => {
      const filtered = prev.filter(it => !itemsToRemove.has(it.id));
      const withNewSeats = [...filtered, ...newSeats];
      return withNewSeats.map(it => {
        const dX = it.tableId ? tableDx.get(it.tableId) : undefined;
        if (dX !== undefined) return { ...it, x: it.x + dX };
        return it;
      });
    });
  };

  const seatedIds = useMemo(() => new Set(items.map(i => i.memberId).filter(Boolean)), [items]);
  const unseated = members.filter(m => !seatedIds.has(m.id));
  const rItems = items.filter(it => it.roomId === activeRoomId);
  const rTables = tables.filter(t => t.roomId === activeRoomId);

  return (
    <DndContext sensors={sensors} onDragStart={e => {
      if (e.active.data.current && "displayName" in e.active.data.current) {
        setActiveMember(e.active.data.current as unknown as Member);
      }
    }} onDragEnd={handleDragEnd}>
      <main className="flex h-screen bg-[#f1f5f9] overflow-hidden text-slate-800">
        <nav className="w-16 h-full bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400">
          <Link href="/" className="p-2 transition-colors text-white ring-2 ring-blue-500 rounded-xl"><LayoutGrid className="w-6 h-6" /></Link>
          <Link href="/members" className="p-2 hover:text-white transition-colors"><Users className="w-6 h-6" /></Link>
          <div className="mt-auto p-2 text-slate-600 hover:text-white transition-colors cursor-pointer group relative">
            <Settings className="w-6 h-6" />
          </div>
        </nav>
        <Sidebar
          members={unseated}
          rooms={ROOMS}
          selectedRoomId={activeRoomId}
          onRoomChange={setActiveRoomId}
          columnConfigs={columnConfigs}
          onUpdateColumnSeats={updateColumnSeats}
        />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shadow-sm z-10 transition-all">
            <div className="flex flex-col">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Seating Dashboard</h1>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                  <span className="px-3 py-1 text-xs font-bold text-slate-700 w-12 text-center">{currentYear}</span>
                  <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Room: {ROOMS.find(r => r.id === activeRoomId)?.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={addObj} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">+ Object</button>
              <button onClick={addColumn} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"><Grid3X3 className="w-4 h-4" />+ Column</button>
              <button onClick={addRow} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2"><Plus className="w-4 h-4" />Add Row</button>
              <div className="w-[1px] h-8 bg-slate-200 mx-2" />
              <button onClick={() => setShowPdfUploader(!showPdfUploader)} className={cn("p-2.5 border rounded-xl shadow-sm", showPdfUploader ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200")} title="Import PDF"><FileText className="w-5 h-5" /></button>
              <button onClick={clear} className="p-2.5 border border-red-100 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm" title="Clear Layout"><Trash2 className="w-5 h-5" /></button>
            </div>
          </header>
          {showPdfUploader && <div className="px-8 pt-8 shrink-0 bg-[#f1f5f9]"><PdfUploader onAssign={handleAssignPdfResults} /></div>}
          <LayoutEditor
            items={rItems}
            tables={rTables}
            members={members}
            historyMap={historyMap}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onUpdateLabel={updateItemLabel}
            onDeleteItem={deleteItem}
            onDeleteTable={deleteTable}
            onUpdateColumnSeats={updateColumnSeats}
            onMoveRow={moveRow}
            onMoveColumn={moveColumn}
          />
        </div>
        <DragOverlay>{activeMember && <div className="w-64 rotate-3 scale-110 pointer-events-none drop-shadow-2xl"><MemberCard member={activeMember} isDragging /></div>}</DragOverlay>
      </main>
    </DndContext>
  );
}

"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { Member } from "@/lib/types";

interface CsvUploaderProps {
    onMembersAdded: (members: Omit<Member, "id">[]) => void;
}

export function CsvUploader({ onMembersAdded }: CsvUploaderProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setIsParsing(false);
                const data = results.data as any[];

                try {
                    const newMembers: Omit<Member, "id">[] = data.map((row) => ({
                        firstName: row["First Name"] || row["First Name"] || "",
                        lastName: row["Last Name"] || row["Last Name"] || "",
                        displayName: row["Display Name"] || row["Display Name"] || "",
                        roomId: (row["Room"] || row["Room"] || "main").toLowerCase(),
                    })).filter(m => m.displayName);

                    if (newMembers.length === 0) {
                        setError("No valid data found in CSV. Ensure columns match: First Name, Last Name, Display Name, Room.");
                        return;
                    }

                    onMembersAdded(newMembers);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                } catch (err) {
                    setError("Error processing file.");
                }
            },
            error: () => {
                setIsParsing(false);
                setError("Error reading file.");
            },
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-600 font-semibold text-sm"
            >
                <Upload className="w-4 h-4" />
                {isParsing ? "Parsing..." : "Import from CSV"}
            </button>

            {error && (
                <div className="flex items-center gap-2 text-red-500 text-[10px] mt-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}
        </div>
    );
}

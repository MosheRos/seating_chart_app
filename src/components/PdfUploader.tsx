"use client";

import { useState } from "react";
import { Upload, FileText, Check, AlertCircle, Loader2, List, ChevronRight } from "lucide-react";

interface PdfUploaderProps {
    onAssign: (lines: string[]) => void;
}

export function PdfUploader({ onAssign }: PdfUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [year, setYear] = useState(new Date().getFullYear() - 1);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("year", year.toString());

        try {
            const response = await fetch("/api/upload/pdf", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error(err);
            setResult({ error: "Failed to parse PDF backend." });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        Import Seating Chart (PDF)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Upload a legacy chart to extract member names and seats</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-2">Target Year</label>
                    <input
                        type="number"
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold w-20 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50/30 hover:border-blue-300 transition-all group relative overflow-hidden">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                            {isUploading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                    <p className="text-sm font-bold text-blue-600 animate-pulse">Analyzing document...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 text-slate-300 mb-4 group-hover:text-blue-500 transition-all scale-100 group-hover:scale-110" />
                                    <p className="mb-2 text-sm text-slate-600 font-bold">Drop PDF here</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-extrabold">Maximum file size: 10MB</p>
                                </>
                            )}
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isUploading} />
                    </label>
                </div>

                <div className="flex flex-col">
                    <div className="flex-1 border border-slate-100 bg-slate-50/50 rounded-3xl p-6 overflow-hidden flex flex-col min-h-[256px]">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <List className="w-3 h-3" />
                            Extraction Results
                        </h4>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {result && !result.error && result.lines?.length > 0 ? (
                                result.lines.map((line: string, i: number) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                        <div className="w-5 h-5 bg-slate-100 text-[10px] font-bold text-slate-400 rounded-lg flex items-center justify-center shrink-0">{i + 1}</div>
                                        <p className="text-xs font-medium text-slate-700 dir-rtl text-right flex-1 truncate" dir="rtl">{line}</p>
                                        <ChevronRight className="w-3 h-3 text-slate-300" />
                                    </div>
                                ))
                            ) : result?.error ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <div className="p-3 bg-red-50 text-red-500 rounded-2xl mb-3">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-bold text-red-600">{result.error}</p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No data extracted yet</p>
                                </div>
                            )}
                        </div>

                        {result && !result.error && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400">{result.lines.length} items found</span>
                                <button
                                    onClick={() => onAssign(result.lines)}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Assign All
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

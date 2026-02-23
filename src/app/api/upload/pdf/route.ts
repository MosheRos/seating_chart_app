import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const year = formData.get("year") as string;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const pdfParser = new PDFParser();

        const pdfData = await new Promise<any>((resolve, reject) => {
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", (data: any) => resolve(data));
            pdfParser.parseBuffer(buffer);
        });

        // Extract text elements with coordinates
        // pdfData.Pages is an array of pages
        // Each page has a 'Texts' array
        const textElements: Array<{ x: number; y: number; text: string }> = [];

        pdfData.Pages.forEach((page: any) => {
            page.Texts.forEach((text: any) => {
                const decodedText = decodeURIComponent(text.R[0].T);
                textElements.push({
                    x: text.x,
                    y: text.y,
                    text: decodedText.trim()
                });
            });
        });

        // Spatial grouping: Sort by Y, then by X
        // We cluster elements into 'rows' if their Y difference is small
        const rows: Array<Array<{ x: number; y: number; text: string }>> = [];
        textElements.sort((a, b) => a.y - b.y || a.x - b.x);

        let currentRow: Array<{ x: number; y: number; text: string }> = [];
        let lastY = -1;

        textElements.forEach(el => {
            if (lastY === -1 || Math.abs(el.y - lastY) < 0.5) { // Tolerance for 'same line'
                currentRow.push(el);
            } else {
                rows.push(currentRow.sort((a, b) => a.x - b.x));
                currentRow = [el];
            }
            lastY = el.y;
        });
        if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => a.x - b.x));

        // Format into human-readable lines
        const formattedLines = rows.map(row => row.map(el => el.text).join(" | "));

        return NextResponse.json({
            year: parseInt(year),
            lines: formattedLines,
            rawElements: textElements,
            message: "PDF parsed spatially (Grid detected)",
            summary: `Found ${rows.length} rows of text across pages.`
        });

    } catch (error: unknown) {
        console.error("PDF Parsing Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({
            error: `Failed to parse PDF: ${message}`,
        }, { status: 500 });
    }
}

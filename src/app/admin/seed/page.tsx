"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  ListPlus,
  Loader2,
  MapPinned,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

type SeedRow = Record<string, unknown>;

type ParsedValidationRow = {
  rowNumber: number;
  name: string;
  location: string;
  primary_subcategory_slug: string;
  price_range: string;
  status: string;
  source: string | null;
  source_id: string | null;
  lat: number | null;
  lng: number | null;
};

type ValidationRow = {
  rowNumber: number;
  raw: SeedRow;
  parsed: ParsedValidationRow | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  blocking: boolean;
};

type ValidationPayload = {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    blockingRows: number;
  };
  rows: ValidationRow[];
};

type InsertPayload = {
  summary: {
    totalRows: number;
    insertedCount: number;
    skippedCount: number;
    skippedDuplicates: number;
    rejectedCount: number;
  };
  insertedRows: Array<{ id: string; rowNumber: number; name: string }>;
  skippedRows: Array<{ rowNumber: number; name: string | null; reasons: string[] }>;
  rejectedRows: Array<{ rowNumber: number; name: string | null; reasons: string[] }>;
};

type ToastState = { type: "success" | "error" | "info"; message: string };

type ManualRow = {
  name: string;
  location: string;
  primary_subcategory_slug: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  image_url: string;
  price_range: string;
  status: string;
  badge: string;
  verified: string;
  is_hidden: string;
  is_system: string;
  is_chain: string;
  source: string;
  source_id: string;
  lat: string;
  lng: string;
  hours: string;
};

const EMPTY_MANUAL_ROW: ManualRow = {
  name: "",
  location: "",
  primary_subcategory_slug: "",
  address: "",
  description: "",
  phone: "",
  email: "",
  website: "",
  image_url: "",
  price_range: "$$",
  status: "active",
  badge: "",
  verified: "",
  is_hidden: "",
  is_system: "",
  is_chain: "",
  source: "",
  source_id: "",
  lat: "",
  lng: "",
  hours: "",
};

function cloneEmptyManualRow(): ManualRow {
  return { ...EMPTY_MANUAL_ROW };
}

function rowHasData(row: SeedRow): boolean {
  return Object.values(row).some((value) => String(value ?? "").trim().length > 0);
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function toNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(numeric) ? numeric : null;
}

function toManualSeedRow(row: ManualRow): SeedRow {
  return {
    name: row.name,
    location: row.location,
    primary_subcategory_slug: row.primary_subcategory_slug,
    address: row.address,
    description: row.description,
    phone: row.phone,
    email: row.email,
    website: row.website,
    image_url: row.image_url,
    price_range: row.price_range,
    status: row.status,
    badge: row.badge,
    verified: row.verified,
    is_hidden: row.is_hidden,
    is_system: row.is_system,
    is_chain: row.is_chain,
    source: row.source,
    source_id: row.source_id,
    lat: row.lat,
    lng: row.lng,
    hours: row.hours,
  };
}

export default function SeedPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [seedRows, setSeedRows] = useState<SeedRow[]>([]);
  const [manualRows, setManualRows] = useState<ManualRow[]>([cloneEmptyManualRow()]);
  const [singleRow, setSingleRow] = useState<ManualRow>(cloneEmptyManualRow());
  const [validation, setValidation] = useState<ValidationPayload | null>(null);
  const [insertResult, setInsertResult] = useState<InsertPayload | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 });

  const validationMap = useMemo(() => {
    const map = new Map<number, ValidationRow>();
    for (const row of validation?.rows || []) map.set(row.rowNumber, row);
    return map;
  }, [validation]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resetResults = () => {
    setValidation(null);
    setInsertResult(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "csv") {
      setToast({ type: "error", message: "Only .xlsx and .csv files are supported." });
      return;
    }

    setIsParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("No worksheet found in uploaded file.");

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const filteredRows = rows.filter((row) => rowHasData(row));

      setSeedRows(filteredRows);
      resetResults();
      setToast({ type: "success", message: `Loaded ${filteredRows.length} row(s) from ${file.name}.` });
    } catch (error: any) {
      setToast({ type: "error", message: error?.message || "Failed to parse file." });
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleValidate = async () => {
    if (seedRows.length === 0) {
      setToast({ type: "error", message: "Add rows first before validating." });
      return;
    }

    setIsValidating(true);
    setInsertResult(null);

    try {
      const response = await fetch("/api/admin/seed/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: seedRows, allowDuplicates }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.details || "Validation failed.");

      setValidation({ summary: data.summary, rows: data.rows });
      setToast({ type: "success", message: "Validation complete." });
    } catch (error: any) {
      setToast({ type: "error", message: error?.message || "Validation request failed." });
    } finally {
      setIsValidating(false);
    }
  };

  const handleInsert = async (mode: "all" | "valid_only") => {
    if (seedRows.length === 0) {
      setToast({ type: "error", message: "Add rows first before inserting." });
      return;
    }

    setIsInserting(true);
    try {
      const response = await fetch("/api/admin/seed/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: seedRows, mode, allowDuplicates }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data?.rows && data?.summary) {
          setValidation({ summary: data.summary, rows: data.rows });
        }
        throw new Error(data?.error || data?.details || "Insert failed.");
      }

      setInsertResult({
        summary: data.summary,
        insertedRows: data.insertedRows || [],
        skippedRows: data.skippedRows || [],
        rejectedRows: data.rejectedRows || [],
      });

      setToast({
        type: "success",
        message: `Insert complete. Added ${data?.summary?.insertedCount || 0} business(es).`,
      });
    } catch (error: any) {
      setToast({ type: "error", message: error?.message || "Insert request failed." });
    } finally {
      setIsInserting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    const rows = validation?.rows || [];
    const failedRows = rows.filter((row) => row.errors.length > 0 || row.warnings.length > 0);

    if (failedRows.length === 0) {
      setToast({ type: "info", message: "No errors/warnings to export." });
      return;
    }

    const header = [
      "row_number",
      "name",
      "location",
      "primary_subcategory_slug",
      "errors",
      "warnings",
    ];
    const lines = [header.join(",")];

    for (const row of failedRows) {
      const name = toDisplayValue(row.raw.name || row.parsed?.name || "");
      const location = toDisplayValue(row.raw.location || row.parsed?.location || "");
      const slug = toDisplayValue(row.raw.primary_subcategory_slug || row.parsed?.primary_subcategory_slug || "");

      const values = [
        String(row.rowNumber),
        JSON.stringify(name),
        JSON.stringify(location),
        JSON.stringify(slug),
        JSON.stringify(row.errors.join("; ")),
        JSON.stringify(row.warnings.join("; ")),
      ];

      lines.push(values.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "seed-error-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddSingleRow = () => {
    const newRow = toManualSeedRow(singleRow);
    if (!rowHasData(newRow)) {
      setToast({ type: "error", message: "Single entry is empty." });
      return;
    }

    setManualRows((prev) => [...prev, singleRow]);
    setSingleRow(cloneEmptyManualRow());
    setToast({ type: "success", message: "Manual row added to queue." });
  };

  const handleManualRowChange = (index: number, field: keyof ManualRow, value: string) => {
    setManualRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const handleRemoveManualRow = (index: number) => {
    setManualRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleAddBlankManualRow = () => {
    setManualRows((prev) => [...prev, cloneEmptyManualRow()]);
  };

  const handleLoadManualRows = () => {
    const prepared = manualRows.map(toManualSeedRow).filter((row) => rowHasData(row));
    setSeedRows(prepared);
    setActiveTab("upload");
    resetResults();
    setToast({ type: "success", message: `Loaded ${prepared.length} manual row(s) into preview.` });
  };

  const handleGenerateCoordinates = async () => {
    if (seedRows.length === 0) {
      setToast({ type: "error", message: "No rows available to geocode." });
      return;
    }

    const pending = seedRows
      .map((row, index) => {
        const lat = toNumeric(row.lat);
        const lng = toNumeric(row.lng);
        if (lat !== null && lng !== null) return null;
        const query = String(row.address || row.location || "").trim();
        if (!query) return null;
        return { index, query };
      })
      .filter(Boolean) as Array<{ index: number; query: string }>;

    if (pending.length === 0) {
      setToast({ type: "info", message: "All rows already have coordinates (or missing address/location)." });
      return;
    }

    setIsGeocoding(true);
    setGeocodeProgress({ current: 0, total: pending.length });
    const updatedRows = [...seedRows];

    try {
      const batchSize = 10;
      for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize);
        const response = await fetch("/api/admin/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch.map((item) => ({ query: item.query })) }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || data?.details || "Geocoding failed.");

        const results = Array.isArray(data?.results) ? data.results : [];
        for (let index = 0; index < results.length; index += 1) {
          const result = results[index];
          const source = batch[index];
          if (!source || !result?.success) continue;
          updatedRows[source.index] = { ...updatedRows[source.index], lat: result.lat, lng: result.lng };
        }

        setSeedRows([...updatedRows]);
        setGeocodeProgress({ current: Math.min(i + batch.length, pending.length), total: pending.length });
      }

      resetResults();
      setToast({ type: "success", message: "Coordinate generation completed." });
    } catch (error: any) {
      setToast({ type: "error", message: error?.message || "Failed to generate coordinates." });
    } finally {
      setIsGeocoding(false);
    }
  };

  const previewRows = useMemo(() => seedRows.slice(0, 200), [seedRows]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
          style={{ fontFamily: FONT }}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-charcoal" style={{ fontFamily: FONT }}>
            Admin Cold Seed Businesses
          </h1>
          <p className="text-sm text-charcoal/60 mt-1" style={{ fontFamily: FONT }}>
            Upload an Excel sheet or add manual rows, validate, then batch insert safely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/api/admin/seed/template"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-charcoal/15 px-4 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
            style={{ fontFamily: FONT }}
          >
            <Download className="w-4 h-4" />
            Download Template
          </Link>
          <Link href="/admin" className="text-sm font-medium text-charcoal/70 hover:text-charcoal" style={{ fontFamily: FONT }}>
            ? Back to Admin
          </Link>
        </div>
      </div>

      <div className="rounded-[12px] border border-charcoal/15 bg-card-bg p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "upload" ? "bg-white text-card-bg" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            style={{ fontFamily: FONT }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Upload Excel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "manual" ? "bg-white text-card-bg" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            style={{ fontFamily: FONT }}
          >
            <ListPlus className="w-4 h-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {activeTab === "upload" && (
        <section className="rounded-[12px] border border-charcoal/15 bg-white p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full bg-card-bg text-white px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-card-bg/90" style={{ fontFamily: FONT }}>
              <Upload className="w-4 h-4" />
              {isParsing ? "Parsing..." : "Upload .xlsx / .csv"}
              <input type="file" accept=".xlsx,.csv" className="hidden" disabled={isParsing} onChange={handleFileChange} />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-charcoal/80" style={{ fontFamily: FONT }}>
              <input type="checkbox" checked={allowDuplicates} onChange={(event) => setAllowDuplicates(event.target.checked)} className="rounded border-charcoal/30" />
              Allow duplicates
            </label>

            <button type="button" onClick={handleValidate} disabled={isValidating || isInserting || isGeocoding || seedRows.length === 0} className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/20 px-4 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5 disabled:opacity-50" style={{ fontFamily: FONT }}>
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Validate (Dry Run)
            </button>

            <button type="button" onClick={() => handleInsert("all")} disabled={isValidating || isInserting || isGeocoding || seedRows.length === 0} className="inline-flex items-center gap-1.5 rounded-full bg-card-bg text-white px-4 py-2 text-sm font-semibold hover:bg-card-bg/90 disabled:opacity-50" style={{ fontFamily: FONT }}>
              {isInserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Insert
            </button>

            <button type="button" onClick={() => handleInsert("valid_only")} disabled={isValidating || isInserting || isGeocoding || seedRows.length === 0} className="inline-flex items-center gap-1.5 rounded-full border border-card-bg/30 bg-card-bg/10 px-4 py-2 text-sm font-semibold text-card-bg hover:bg-card-bg/20 disabled:opacity-50" style={{ fontFamily: FONT }}>
              {isInserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Insert Valid Only
            </button>

            <button type="button" onClick={handleGenerateCoordinates} disabled={isValidating || isInserting || isGeocoding || seedRows.length === 0} className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/20 px-4 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5 disabled:opacity-50" style={{ fontFamily: FONT }}>
              {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPinned className="w-4 h-4" />} Generate Coordinates
            </button>

            <button type="button" onClick={handleDownloadErrorReport} disabled={!validation} className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/20 px-4 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5 disabled:opacity-50" style={{ fontFamily: FONT }}>
              <Download className="w-4 h-4" /> Download Error Report
            </button>
          </div>

          {isGeocoding && (
            <p className="text-sm text-charcoal/70 mt-3" style={{ fontFamily: FONT }}>
              Geocoding progress: {geocodeProgress.current}/{geocodeProgress.total}
            </p>
          )}
        </section>
      )}

      {activeTab === "manual" && (
        <section className="space-y-4 mb-4">
          <div className="rounded-[12px] border border-charcoal/15 bg-white p-4">
            <h2 className="text-base font-semibold text-charcoal mb-3" style={{ fontFamily: FONT }}>Single Add</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={singleRow.name} onChange={(event) => setSingleRow((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name *" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.location} onChange={(event) => setSingleRow((prev) => ({ ...prev, location: event.target.value }))} placeholder="Location *" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.primary_subcategory_slug} onChange={(event) => setSingleRow((prev) => ({ ...prev, primary_subcategory_slug: event.target.value }))} placeholder="primary_subcategory_slug *" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.address} onChange={(event) => setSingleRow((prev) => ({ ...prev, address: event.target.value }))} placeholder="Address" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.description} onChange={(event) => setSingleRow((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.phone} onChange={(event) => setSingleRow((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.email} onChange={(event) => setSingleRow((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.website} onChange={(event) => setSingleRow((prev) => ({ ...prev, website: event.target.value }))} placeholder="Website" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.image_url} onChange={(event) => setSingleRow((prev) => ({ ...prev, image_url: event.target.value }))} placeholder="Image URL" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.badge} onChange={(event) => setSingleRow((prev) => ({ ...prev, badge: event.target.value }))} placeholder="Badge" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <select value={singleRow.verified} onChange={(event) => setSingleRow((prev) => ({ ...prev, verified: event.target.value }))} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }}>
                <option value="">verified (optional)</option><option value="true">TRUE</option><option value="false">FALSE</option>
              </select>
              <select value={singleRow.is_hidden} onChange={(event) => setSingleRow((prev) => ({ ...prev, is_hidden: event.target.value }))} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }}>
                <option value="">is_hidden (optional)</option><option value="true">TRUE</option><option value="false">FALSE</option>
              </select>
              <select value={singleRow.is_system} onChange={(event) => setSingleRow((prev) => ({ ...prev, is_system: event.target.value }))} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }}>
                <option value="">is_system (optional)</option><option value="true">TRUE</option><option value="false">FALSE</option>
              </select>
              <select value={singleRow.is_chain} onChange={(event) => setSingleRow((prev) => ({ ...prev, is_chain: event.target.value }))} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }}>
                <option value="">is_chain (optional)</option><option value="true">TRUE</option><option value="false">FALSE</option>
              </select>
              <input value={singleRow.source} onChange={(event) => setSingleRow((prev) => ({ ...prev, source: event.target.value }))} placeholder="Source" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.source_id} onChange={(event) => setSingleRow((prev) => ({ ...prev, source_id: event.target.value }))} placeholder="Source ID" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.lat} onChange={(event) => setSingleRow((prev) => ({ ...prev, lat: event.target.value }))} placeholder="Lat" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <input value={singleRow.lng} onChange={(event) => setSingleRow((prev) => ({ ...prev, lng: event.target.value }))} placeholder="Lng" className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }} />
              <select value={singleRow.price_range} onChange={(event) => setSingleRow((prev) => ({ ...prev, price_range: event.target.value }))} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }}>
                <option value="$">$</option><option value="$$">$$</option><option value="$$$">$$$</option><option value="$$$$">$$$$</option>
              </select>
              <select value={singleRow.status} onChange={(event) => setSingleRow((prev) => ({ ...prev, status: event.target.value }))} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" style={{ fontFamily: FONT }}>
                <option value="active">active</option><option value="inactive">inactive</option><option value="pending">pending</option><option value="pending_approval">pending_approval</option><option value="rejected">rejected</option>
              </select>
              <input value={singleRow.hours} onChange={(event) => setSingleRow((prev) => ({ ...prev, hours: event.target.value }))} placeholder='Hours JSON, e.g. {"monday":"09:00-17:00"}' className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm sm:col-span-3" style={{ fontFamily: FONT }} />
            </div>
            <div className="mt-3">
              <button type="button" onClick={handleAddSingleRow} className="inline-flex items-center gap-1.5 rounded-full bg-card-bg text-white px-4 py-2 text-sm font-semibold hover:bg-card-bg/90" style={{ fontFamily: FONT }}>
                <Plus className="w-4 h-4" /> Add Single Row
              </button>
            </div>
          </div>

          <div className="rounded-[12px] border border-charcoal/15 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-charcoal" style={{ fontFamily: FONT }}>Multi-row Queue</h2>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddBlankManualRow} className="inline-flex items-center gap-1 rounded-full border border-charcoal/20 px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5" style={{ fontFamily: FONT }}><Plus className="w-3.5 h-3.5" /> Add Row</button>
                <button type="button" onClick={handleLoadManualRows} className="inline-flex items-center gap-1 rounded-full bg-card-bg text-white px-3 py-1.5 text-xs font-semibold hover:bg-card-bg/90" style={{ fontFamily: FONT }}>Use Manual Rows</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-charcoal/70 border-b border-charcoal/10">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2">Subcategory Slug</th>
                    <th className="px-2 py-2">Price</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Address</th>
                    <th className="px-2 py-2">Source</th>
                    <th className="px-2 py-2">Source ID</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, index) => (
                    <tr key={`manual-row-${index}`} className="border-b border-charcoal/5">
                      <td className="px-2 py-2"><input value={row.name} onChange={(event) => handleManualRowChange(index, "name", event.target.value)} className="w-40 rounded border border-charcoal/20 px-2 py-1" /></td>
                      <td className="px-2 py-2"><input value={row.location} onChange={(event) => handleManualRowChange(index, "location", event.target.value)} className="w-36 rounded border border-charcoal/20 px-2 py-1" /></td>
                      <td className="px-2 py-2"><input value={row.primary_subcategory_slug} onChange={(event) => handleManualRowChange(index, "primary_subcategory_slug", event.target.value)} className="w-44 rounded border border-charcoal/20 px-2 py-1" /></td>
                      <td className="px-2 py-2">
                        <select value={row.price_range} onChange={(event) => handleManualRowChange(index, "price_range", event.target.value)} className="rounded border border-charcoal/20 px-2 py-1">
                          <option value="$">$</option><option value="$$">$$</option><option value="$$$">$$$</option><option value="$$$$">$$$$</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select value={row.status} onChange={(event) => handleManualRowChange(index, "status", event.target.value)} className="rounded border border-charcoal/20 px-2 py-1">
                          <option value="active">active</option><option value="inactive">inactive</option><option value="pending">pending</option><option value="pending_approval">pending_approval</option><option value="rejected">rejected</option>
                        </select>
                      </td>
                      <td className="px-2 py-2"><input value={row.address} onChange={(event) => handleManualRowChange(index, "address", event.target.value)} className="w-48 rounded border border-charcoal/20 px-2 py-1" /></td>
                      <td className="px-2 py-2"><input value={row.source} onChange={(event) => handleManualRowChange(index, "source", event.target.value)} className="w-24 rounded border border-charcoal/20 px-2 py-1" /></td>
                      <td className="px-2 py-2"><input value={row.source_id} onChange={(event) => handleManualRowChange(index, "source_id", event.target.value)} className="w-28 rounded border border-charcoal/20 px-2 py-1" /></td>
                      <td className="px-2 py-2 text-right">
                        <button type="button" onClick={() => handleRemoveManualRow(index)} className="inline-flex items-center justify-center rounded-full p-1 text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[12px] border border-charcoal/15 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="inline-flex rounded-full bg-charcoal/10 px-3 py-1 text-xs font-semibold text-charcoal" style={{ fontFamily: FONT }}>Rows loaded: {seedRows.length}</span>
          {validation && (
            <>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800" style={{ fontFamily: FONT }}>Valid: {validation.summary.validRows}</span>
              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800" style={{ fontFamily: FONT }}>Invalid: {validation.summary.invalidRows}</span>
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800" style={{ fontFamily: FONT }}>Duplicates: {validation.summary.duplicateRows}</span>
            </>
          )}
          {insertResult && <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800" style={{ fontFamily: FONT }}>Inserted: {insertResult.summary.insertedCount}</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 bg-charcoal/5 text-left">
                <th className="px-3 py-2 font-semibold text-charcoal">Row</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Name</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Location</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Subcategory</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Price</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Status</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Source</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Coordinates</th>
                <th className="px-3 py-2 font-semibold text-charcoal">Validation</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-charcoal/60" style={{ fontFamily: FONT }}>
                    No rows loaded yet.
                  </td>
                </tr>
              )}

              {previewRows.map((row, index) => {
                const rowNumber = index + 1;
                const validated = validationMap.get(rowNumber);
                const hasErrors = (validated?.errors?.length || 0) > 0;
                const hasWarnings = (validated?.warnings?.length || 0) > 0;
                const parsed = validated?.parsed;
                const name = parsed?.name || toDisplayValue(row.name);
                const location = parsed?.location || toDisplayValue(row.location);
                const subcategory = parsed?.primary_subcategory_slug || toDisplayValue(row.primary_subcategory_slug);
                const price = parsed?.price_range || toDisplayValue(row.price_range || "$$");
                const status = parsed?.status || toDisplayValue(row.status || "active");
                const source = parsed?.source || toDisplayValue(row.source);
                const sourceId = parsed?.source_id || toDisplayValue(row.source_id);
                const lat = parsed?.lat ?? toNumeric(row.lat);
                const lng = parsed?.lng ?? toNumeric(row.lng);
                const coords = lat !== null && lng !== null ? `${lat}, ${lng}` : "-";

                return (
                  <tr key={`preview-row-${rowNumber}`} className={`border-b border-charcoal/5 ${hasErrors ? "bg-red-50/70" : hasWarnings ? "bg-amber-50/70" : ""}`}>
                    <td className="px-3 py-2 text-charcoal/70">{rowNumber}</td>
                    <td className="px-3 py-2 text-charcoal">{name || "-"}</td>
                    <td className="px-3 py-2 text-charcoal/80">{location || "-"}</td>
                    <td className="px-3 py-2 text-charcoal/80">{subcategory || "-"}</td>
                    <td className="px-3 py-2 text-charcoal/80">{price || "-"}</td>
                    <td className="px-3 py-2 text-charcoal/80">{status || "-"}</td>
                    <td className="px-3 py-2 text-charcoal/70">{source && sourceId ? `${source}:${sourceId}` : "-"}</td>
                    <td className="px-3 py-2 text-charcoal/70">{coords}</td>
                    <td className="px-3 py-2">
                      {!validated && <span className="text-charcoal/50">Not validated</span>}
                      {validated && hasErrors && (
                        <div className="text-red-700 text-xs" style={{ fontFamily: FONT }}>
                          <div className="inline-flex items-center gap-1 font-semibold mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Invalid</div>
                          <p>{validated.errors.join("; ")}</p>
                        </div>
                      )}
                      {validated && !hasErrors && hasWarnings && (
                        <div className="text-amber-800 text-xs" style={{ fontFamily: FONT }}>
                          <p className="font-semibold">Warning</p>
                          <p>{validated.warnings.join("; ")}</p>
                        </div>
                      )}
                      {validated && !hasErrors && !hasWarnings && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold" style={{ fontFamily: FONT }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {seedRows.length > previewRows.length && (
          <p className="text-xs text-charcoal/60 mt-2" style={{ fontFamily: FONT }}>
            Showing first {previewRows.length} rows of {seedRows.length}.
          </p>
        )}
      </section>
    </main>
  );
}

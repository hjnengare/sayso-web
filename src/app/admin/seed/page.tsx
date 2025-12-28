"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader, CheckCircle, XCircle } from "react-feather";

export default function SeedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<{
    message: string;
    step: string;
    details?: string;
    code?: string;
    suggestion?: string;
  } | null>(null);
  const [step, setStep] = useState<"idle" | "testing" | "seeding" | "verifying" | "complete">("idle");
  const [limit, setLimit] = useState(100);

  const getErrorSuggestion = (errorMessage: string, code?: string): string => {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes("database") && msg.includes("connection")) {
      return "Check your Supabase connection string in .env.local (NEXT_PUBLIC_SUPABASE_URL)";
    }
    if (msg.includes("unauthorized") || msg.includes("permission") || code === "PGRST301" || code === "42501") {
      return "Check your RLS (Row Level Security) policies in Supabase. Make sure public SELECT/INSERT is allowed.";
    }
    if (msg.includes("column") && msg.includes("does not exist")) {
      return "Run the database migration: businesses-migration-osm.sql in your Supabase SQL Editor";
    }
    if (msg.includes("overpass") || msg.includes("timeout")) {
      return "The Overpass API might be slow or rate-limited. Try again in a few seconds.";
    }
    if (msg.includes("relation") || msg.includes("table") && msg.includes("does not exist")) {
      return "The businesses table doesn't exist. Run businesses.sql schema in Supabase SQL Editor";
    }
    if (msg.includes("unique constraint") || msg.includes("duplicate")) {
      return "Some businesses already exist. This is normal - the upsert will update them.";
    }
    if (msg.includes("no businesses found")) {
      return "Overpass API returned no results. Check your internet connection and try again.";
    }
    return "Check your server logs for more details. Common issues: missing env variables, RLS policies, or database schema.";
  };

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setStep("testing");

    try {
      // Step 1: Test DB connection
      const testRes = await fetch("/api/test-db");
      
      if (!testRes.ok) {
        const errorData = await testRes.json().catch(() => ({ error: "Failed to connect to database" }));
        throw {
          message: errorData.error || "Database connection failed",
          step: "Testing Database Connection",
          code: errorData.code,
          details: errorData.error || "Could not connect to Supabase",
        };
      }

      const testData = await testRes.json();

      if (!testData.connected) {
        throw {
          message: testData.error || "Database not connected",
          step: "Testing Database Connection",
          code: testData.code,
          details: testData.error || "Database connection check failed",
        };
      }

      setStep("seeding");

      // Step 2: Seed database
      const seedRes = await fetch("/api/businesses/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });

      const seedData = await seedRes.json();

      if (!seedRes.ok || !seedData.success) {
        throw {
          message: seedData.error || seedData.message || "Seed operation failed",
          step: "Seeding Database",
          code: seedData.code,
          details: seedData.details || seedData.error || "Failed to insert businesses",
        };
      }

      setResult(seedData);
      setStep("verifying");

      // Step 3: Verify data
      const verifyRes = await fetch("/api/test-db");
      const verifyData = await verifyRes.json();

      // Step 4: Test API pull
      const apiRes = await fetch(`/api/businesses?limit=5`);
      const apiData = await apiRes.json();

      if (apiRes.ok && apiData.data) {
        setResult({
          ...seedData,
          verification: verifyData,
          apiTest: {
            count: apiData.data?.length || 0,
            total: apiData.meta?.totalCount || 0,
          },
        });
        setStep("complete");
      } else {
        throw {
          message: "Data was seeded but API verification failed",
          step: "Verifying API",
          details: "Businesses were inserted but cannot be retrieved via API. Check RLS policies.",
        };
      }
    } catch (err: any) {
      const errorObj = typeof err === "object" && err.message 
        ? err 
        : {
            message: err?.message || err?.toString() || "Failed to seed database",
            step: "Unknown Step",
            details: err?.details || err?.toString(),
          };
      
      setError({
        ...errorObj,
        suggestion: getErrorSuggestion(errorObj.message, errorObj.code),
      });
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-off-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-charcoal/70 hover:text-charcoal mb-4 transition-colors"
            style={{
              fontFamily:
                "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1
            className="text-2xl font-bold text-charcoal mb-2"
            style={{
              fontFamily:
                "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            Seed Database
          </h1>
          <p
            className="text-sm text-charcoal/60"
            style={{
              fontFamily:
                "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            Populate your database with businesses from OpenStreetMap
          </p>
        </div>

        {/* Seed Form */}
        <div className="bg-white rounded-[20px] border border-charcoal/10 p-6 mb-6">
          <div className="mb-6">
            <label
              className="block text-sm font-semibold text-charcoal mb-2"
              style={{
                fontFamily:
                  "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              Number of businesses to seed
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              disabled={loading}
              className="w-full px-4 py-2 rounded-full border border-charcoal/20 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50 transition-all"
              style={{
                fontFamily:
                  "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            />
          </div>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-coral to-coral/90 text-white font-semibold hover:from-coral/90 hover:to-coral/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              fontFamily:
                "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>
                  {step === "testing" && "Testing connection..."}
                  {step === "seeding" && "Seeding database..."}
                  {step === "verifying" && "Verifying data..."}
                </span>
              </>
            ) : (
              "Seed Database"
            )}
          </button>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[20px] p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3
                  className="font-semibold text-red-900 mb-1"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  Error: {error.step}
                </h3>
                <p
                  className="text-sm sm:text-xs text-red-600 font-medium"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  {error.message}
                </p>
              </div>
            </div>
            
            {error.details && (
              <div className="bg-red-100 rounded-lg p-3 mb-3">
                <p
                  className="text-sm sm:text-xs text-red-800 font-medium mb-1"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  Details:
                </p>
                <p
                  className="text-sm sm:text-xs text-red-700 font-mono break-all"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  {error.details}
                </p>
              </div>
            )}

            {error.code && (
              <div className="mb-3">
                <span
                  className="text-sm sm:text-xs text-red-700 font-medium"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  Error Code:{" "}
                </span>
                <span
                  className="text-sm sm:text-xs text-red-800 font-mono bg-red-100 px-2 py-1 rounded"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  {error.code}
                </span>
              </div>
            )}

            {error.suggestion && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p
                  className="text-sm sm:text-xs text-amber-900 font-semibold mb-1"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  💡 Suggestion:
                </p>
                <p
                  className="text-sm sm:text-xs text-amber-800"
                  style={{
                    fontFamily:
                      "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  {error.suggestion}
                </p>
              </div>
            )}
          </div>
        )}

        {result && step === "complete" && (
          <div className="bg-green-50 border border-green-200 rounded-[20px] p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3
                className="font-semibold text-green-900"
                style={{
                  fontFamily:
                    "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
              >
                Success!
              </h3>
            </div>
            <div
              className="text-sm text-green-800 space-y-2"
              style={{
                fontFamily:
                  "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              <p>✅ Seeded {result.count} businesses</p>
              <p>✅ Database has {result.verification?.businessCount || 0} businesses total</p>
              <p>✅ API is returning {result.apiTest?.count || 0} businesses (out of {result.apiTest?.total || 0} total)</p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="mt-4 px-6 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-semibold"
              style={{
                fontFamily:
                  "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              Go to Home
            </button>
          </div>
        )}

        {/* Status */}
        {loading && (
          <div className="bg-white rounded-[20px] border border-charcoal/10 p-6">
            <div className="space-y-3">
              {step === "testing" && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
                  <span
                    className="text-sm text-charcoal/70"
                    style={{
                      fontFamily:
                        "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Testing database connection...
                  </span>
                </div>
              )}
              {step === "seeding" && (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span
                      className="text-sm text-green-700"
                      style={{
                        fontFamily:
                          "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Database connected
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
                    <span
                      className="text-sm text-charcoal/70"
                      style={{
                        fontFamily:
                          "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Fetching businesses from Overpass API...
                    </span>
                  </div>
                </>
              )}
              {step === "verifying" && (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span
                      className="text-sm text-green-700"
                      style={{
                        fontFamily:
                          "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Database seeded
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
                    <span
                      className="text-sm text-charcoal/70"
                      style={{
                        fontFamily:
                          "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Verifying data...
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


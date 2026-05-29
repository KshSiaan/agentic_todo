import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "ok",
    checks: {},
  };

  try {
    // Check Google API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      checks.checks.googleApiKey = {
        status: "error",
        message: "GOOGLE_GENERATIVE_AI_API_KEY not set",
      };
    } else {
      checks.checks.googleApiKey = {
        status: "ok",
        message: "API key configured",
        keyLength: apiKey.length,
      };
    }

    // Check database connection (if applicable)
    try {
      const db = (await import("@/lib/db")).db;
      const todosTable = (await import("@/lib/db")).todosTable;
      const result = await db.select().from(todosTable).limit(1);
      checks.checks.database = {
        status: "ok",
        message: "Database connection working",
      };
    } catch (dbError) {
      checks.checks.database = {
        status: "error",
        message: dbError instanceof Error ? dbError.message : String(dbError),
      };
      checks.status = "degraded";
    }

    // Test Google API with a simple call
    try {
      const model = google("gemma-4-31b-it");
      checks.checks.googleApiModel = {
        status: "ok",
        message: "Model accessible",
        model: "gemma-4-31b-it",
      };
    } catch (modelError) {
      checks.checks.googleApiModel = {
        status: "error",
        message:
          modelError instanceof Error ? modelError.message : String(modelError),
      };
      checks.status = "degraded";
    }

    // Environmental checks
    checks.environment = {
      nodeEnv: process.env.NODE_ENV,
      nextPublicApiUrl:
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    };

    // Overall status
    const hasErrors = Object.values(checks.checks).some(
      (check: any) => check.status === "error",
    );
    if (hasErrors) {
      checks.status = "degraded";
    }

    return NextResponse.json(checks, {
      status: checks.status === "ok" ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        error: {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 },
    );
  }
}

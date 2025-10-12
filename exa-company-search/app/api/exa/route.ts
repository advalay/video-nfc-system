import { NextRequest, NextResponse } from "next/server";
import { searchExaAPI, buildSearchQuery } from "@/lib/exa";

export async function POST(request: NextRequest) {
  try {
    const { industry, region, companySize, limit = 100 } = await request.json();

    if (!industry || !region) {
      return NextResponse.json(
        { error: "業界と地域を選択してください" },
        { status: 400 }
      );
    }

    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Exa API キーが設定されていません" },
        { status: 500 }
      );
    }

    const query = buildSearchQuery(industry, region, companySize);
    const results = await searchExaAPI(query, apiKey, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Exa API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "検索中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}


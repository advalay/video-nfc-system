import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータを構築
    const queryParams = new URLSearchParams();
    if (searchParams.get('startDate')) queryParams.append('startDate', searchParams.get('startDate')!);
    if (searchParams.get('endDate')) queryParams.append('endDate', searchParams.get('endDate')!);
    if (searchParams.get('storeIds')) queryParams.append('storeIds', searchParams.get('storeIds')!);
    if (searchParams.get('companyIds')) queryParams.append('companyIds', searchParams.get('companyIds')!);
    
    const response = await fetch(`${API_BASE_URL}/admin/upload-stats/daily?${queryParams.toString()}`, {
      headers: {
        'X-Store-Token': 'admin-token', // TODO: 適切な認証トークンに置き換える
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to fetch daily upload stats' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily upload stats' },
      { status: 500 }
    );
  }
}

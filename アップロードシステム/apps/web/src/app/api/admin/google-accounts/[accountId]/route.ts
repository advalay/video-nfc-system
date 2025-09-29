import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function DELETE(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const token = request.headers.get('Authorization');
    const { accountId } = params;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const backendResponse = await fetch(`${API_BASE_URL}/admin/google-accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
    });

    if (!backendResponse.ok) {
      const data = await backendResponse.json();
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('API proxy error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

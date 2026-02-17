import { NextRequest, NextResponse } from 'next/server';
import { TEMPLATE_COLUMNS, requireAdminContext } from '../_lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SAMPLE_ROW: Record<string, string> = {
  name: 'Sample Business',
  location: 'Cape Town',
  primary_subcategory_slug: 'restaurants',
  description: 'Optional description',
  address: '123 Main Road, Cape Town',
  phone: '+27 21 000 0000',
  email: 'hello@example.com',
  website: 'https://example.com',
  image_url: 'https://images.example.com/photo.jpg',
  price_range: '$$',
  status: 'active',
  badge: '',
  verified: 'false',
  is_hidden: 'false',
  is_system: 'false',
  is_chain: 'false',
  lat: '-33.9249',
  lng: '18.4241',
  source: 'manual',
  source_id: 'sample-001',
  hours: '{"monday":"09:00-17:00"}',
};

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminContext(req);
  if (admin.ok === false) {
    return admin.response;
  }

  const header = TEMPLATE_COLUMNS.join(',');
  const sample = TEMPLATE_COLUMNS.map((column) => escapeCsv(SAMPLE_ROW[column] || '')).join(',');
  const csv = `${header}\n${sample}\n`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="business-seed-template.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

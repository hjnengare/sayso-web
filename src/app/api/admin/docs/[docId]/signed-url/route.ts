import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'business-verification';
const SIGNED_URL_EXPIRY_SECONDS = 600; // 10 min

export const GET = withAdmin(async (
  _req: NextRequest,
  { service, params }
) => {
  const docId = (await params)?.docId;
  if (!docId) {
    return NextResponse.json({ error: 'docId required' }, { status: 400 });
  }

  const { data: doc, error: docError } = await service
    .from('business_claim_documents')
    .select('id, storage_path')
    .eq('id', docId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  const docRow = doc as { id: string; storage_path: string };
  if (!docRow.storage_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(docRow.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !signed?.signedUrl) {
    console.error('Signed URL error:', signError);
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, expiresIn: SIGNED_URL_EXPIRY_SECONDS });
});

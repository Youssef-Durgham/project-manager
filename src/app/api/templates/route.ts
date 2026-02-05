import { NextResponse } from 'next/server';
import { PROJECT_TEMPLATES } from '@/models/Template';

export async function GET() {
  return NextResponse.json(PROJECT_TEMPLATES);
}

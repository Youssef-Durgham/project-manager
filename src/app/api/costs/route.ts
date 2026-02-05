import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CostEntry from '@/models/CostEntry';

export async function GET(req: NextRequest) {
  await connectDB();
  const projectId = req.nextUrl.searchParams.get('projectId');
  
  const filter: any = {};
  if (projectId) filter.projectId = projectId;
  
  const costs = await CostEntry.find(filter).sort({ createdAt: -1 });
  
  // Calculate summary
  const monthly = costs.filter(c => c.period === 'monthly').reduce((sum: number, c: any) => sum + c.amount, 0);
  const yearly = costs.filter(c => c.period === 'yearly').reduce((sum: number, c: any) => sum + c.amount, 0);
  const oneTime = costs.filter(c => c.period === 'one-time').reduce((sum: number, c: any) => sum + c.amount, 0);
  
  return NextResponse.json({
    costs,
    summary: {
      monthlyTotal: monthly,
      yearlyTotal: yearly + (monthly * 12),
      oneTimeTotal: oneTime,
      estimatedAnnual: (monthly * 12) + yearly + oneTime,
    }
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  
  const cost = await CostEntry.create({
    projectId: body.projectId,
    category: body.category,
    service: body.service,
    amount: body.amount,
    currency: body.currency || 'USD',
    period: body.period || 'monthly',
    startDate: body.startDate,
    endDate: body.endDate,
    notes: body.notes || '',
    isEstimate: body.isEstimate || false,
    addedBy: body.addedBy || 'system',
  });

  return NextResponse.json(cost, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const id = req.nextUrl.searchParams.get('id');
  await CostEntry.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}

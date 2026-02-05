import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Decision from '@/models/Decision';
import Activity from '@/models/Activity';

export async function GET(req: NextRequest) {
  await connectDB();
  const projectId = req.nextUrl.searchParams.get('projectId');
  const category = req.nextUrl.searchParams.get('category');
  
  const filter: any = {};
  if (projectId) filter.projectId = projectId;
  if (category) filter.category = category;
  
  const decisions = await Decision.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(decisions);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  
  const decision = await Decision.create({
    projectId: body.projectId,
    title: body.title,
    description: body.description || '',
    reasoning: body.reasoning || '',
    alternatives: body.alternatives || [],
    madeBy: body.madeBy || 'both',
    category: body.category || 'other',
    impact: body.impact || 'medium',
    status: body.status || 'accepted',
    relatedTaskIds: body.relatedTaskIds || [],
  });

  await Activity.create({
    projectId: body.projectId,
    actor: body.madeBy === 'both' ? 'system' : (body.madeBy || 'system'),
    action: 'decided',
    targetType: 'decision',
    targetId: decision._id.toString(),
    targetName: body.title,
    details: `Decision: ${body.title} [${body.category || 'other'}]`,
  });

  return NextResponse.json(decision, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { id, ...update } = body;
  
  const decision = await Decision.findByIdAndUpdate(id, update, { new: true });
  return NextResponse.json(decision);
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';

// GET activity log for a project
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filter: any = {};
    if (projectId) filter.projectId = projectId;

    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error('Activity GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

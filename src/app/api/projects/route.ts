import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import { v4 as uuid } from 'uuid';

// GET all projects
export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find().sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST create project
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Generate IDs for components, phases, tasks
    if (body.components) {
      body.components = body.components.map((comp: any) => ({
        ...comp,
        id: comp.id || uuid(),
        phases: (comp.phases || []).map((phase: any) => ({
          ...phase,
          id: phase.id || uuid(),
          tasks: (phase.tasks || []).map((task: any) => ({
            ...task,
            id: task.id || uuid(),
          })),
        })),
      }));
    }
    
    const project = await Project.create(body);
    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
  }
}

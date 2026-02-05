// This file is kept for backward compatibility but now uses MongoDB
// Import from @/models/Project and @/lib/mongodb instead

import { connectDB } from './mongodb';
import ProjectModel from '@/models/Project';

export async function getProjects() {
  await connectDB();
  return ProjectModel.find().sort({ updatedAt: -1 });
}

export async function getProject(slugOrId: string) {
  await connectDB();
  return ProjectModel.findOne({ $or: [{ slug: slugOrId }, { _id: slugOrId }] });
}

import mongoose, { Schema, Document } from 'mongoose';

const ActivitySchema = new Schema({
  projectId: { type: String, required: true, index: true },
  actor: { type: String, enum: ['yusif', 'employee-1', 'system'], required: true },
  action: { type: String, required: true }, // e.g. 'task.status', 'task.create', 'comment.add', 'phase.complete'
  targetType: { type: String, default: '' }, // 'task', 'phase', 'component', 'project'
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' },
  details: { type: String, default: '' }, // human-readable description
  metadata: { type: Schema.Types.Mixed, default: {} }, // extra data (old status, new status, etc.)
}, { timestamps: true });

ActivitySchema.index({ projectId: 1, createdAt: -1 });

export interface IActivity extends Document {
  projectId: string;
  actor: 'yusif' | 'employee-1' | 'system';
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  details: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

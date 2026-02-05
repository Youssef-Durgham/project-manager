import mongoose, { Schema } from 'mongoose';

const BlockerSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  taskId: { type: String, default: '' }, // optional link to task
  author: { type: String, enum: ['yusif', 'employee-1'], required: true },
  type: { type: String, enum: ['blocker', 'question', 'decision-needed'], default: 'question' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  resolution: { type: String, default: '' },
  resolvedBy: { type: String, enum: ['yusif', 'employee-1', ''], default: '' },
  resolvedAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.Blocker || mongoose.model('Blocker', BlockerSchema);

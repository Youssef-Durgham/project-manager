import mongoose, { Schema, Document } from 'mongoose';

const CommentSchema = new Schema({
  projectId: { type: String, required: true, index: true },
  phaseId: { type: String, default: '' },
  taskId: { type: String, default: '' },
  author: { type: String, enum: ['yusif', 'employee-1'], required: true },
  text: { type: String, default: '' },
  images: [{ type: String }], // S3 URLs
}, { timestamps: true });

// Compound index for efficient querying
CommentSchema.index({ projectId: 1, taskId: 1, createdAt: -1 });
CommentSchema.index({ projectId: 1, phaseId: 1, createdAt: -1 });

export interface IComment extends Document {
  projectId: string;
  phaseId: string;
  taskId: string;
  author: 'yusif' | 'employee-1';
  text: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

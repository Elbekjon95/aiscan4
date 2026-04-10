import mongoose, { Schema, Document } from 'mongoose';

export interface IInternalDoc extends Document {
  title: string;
  content?: string;
  file_type?: string;
  airport: string;
  is_global: boolean;
  embedding?: number[];
  created_at: Date;
}

const InternalDocSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String },
  file_type: { type: String },
  airport: { type: String, default: 'ALL' },
  is_global: { type: Boolean, default: false },
  embedding: { type: [Number] },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.InternalDoc || mongoose.model<IInternalDoc>('InternalDoc', InternalDocSchema);

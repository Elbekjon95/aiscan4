import mongoose, { Schema, Document } from 'mongoose';

export interface IRequest extends Document {
  file_name: string;
  file_type?: string;
  file_hash?: string;
  analysis_score?: number;
  compliance_score?: number;
  favoritism_score?: number;
  analysis_type: 'document' | 'affiliation' | 'marketing';
  affiliation_status?: string;
  full_analysis?: any;
  corrected_version?: string;
  language: string;
  created_at: Date;
}

const RequestSchema: Schema = new Schema({
  file_name: { type: String, required: true },
  file_type: { type: String },
  file_hash: { type: String, index: true },
  analysis_score: { type: Number },
  compliance_score: { type: Number },
  favoritism_score: { type: Number },
  analysis_type: { type: String, enum: ['document', 'affiliation', 'marketing'], default: 'document' },
  affiliation_status: { type: String },
  full_analysis: { type: Schema.Types.Mixed },
  corrected_version: { type: String },
  language: { type: String, default: 'uz', index: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Request || mongoose.model<IRequest>('Request', RequestSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IAirport extends Document {
  name: string;
  code: string; // IATA code or custom
  type: 'international' | 'regional';
  is_active: boolean;
  notes?: string;
  created_at: Date;
}

const AirportSchema: Schema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['international', 'regional'], default: 'international' },
  is_active: { type: Boolean, default: true },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Airport || mongoose.model<IAirport>('Airport', AirportSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password?: string;
  role: 'super_admin' | 'admin' | 'user';
  airport: string; // TAS, SKD, BFE, etc. or 'ALL'
  created_at: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'user'], default: 'user' },
  airport: { type: String, default: 'TAS' },
  is_primary: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

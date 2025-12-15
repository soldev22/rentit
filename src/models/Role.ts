import mongoose, { Schema, Model } from "mongoose";

const RoleSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    propertyId: { type: String },
    tenancyId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "roles" }
);

export const RoleModel: Model<any> =
  mongoose.models.Role || mongoose.model("Role", RoleSchema);

import mongoose, { Schema, Model } from "mongoose";

const AgentLandlordSchema = new Schema(
  {
    agentId: { type: String, required: true, index: true },
    landlordId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "agentLandlords" }
);

export const AgentLandlordModel: Model<any> =
  mongoose.models.AgentLandlord || mongoose.model("AgentLandlord", AgentLandlordSchema);

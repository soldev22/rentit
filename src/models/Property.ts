import mongoose, { Schema, models, model } from "mongoose";

/**
 * Property lifecycle states
 * Defined once, reused everywhere
 */
export const PROPERTY_STATUSES = [
  "draft",
  "listed",
  "paused",
  "under_offer",
  "offer_made",
  "let",
  "ended",
  "withdrawn",
  "breached",
] as const;

export type PropertyStatus = typeof PROPERTY_STATUSES[number];

/**
 * Photo subdocument
 * Stored as Azure Blob reference only (no binary data)
 */
const PhotoSchema = new Schema(
  {
    url: { type: String, required: true },
    blobName: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Room subdocument
 * Each room must eventually have exactly 2 photos
 */
const RoomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      // examples: bedroom, kitchen, bathroom, lounge
    },
    photos: {
      type: [PhotoSchema],
      default: [],
    },
  },
  { _id: true }
);

/**
 * Main Property schema
 */
const PropertySchema = new Schema(
  {
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    address: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      postcode: { type: String, required: true },
    },

    rentPcm: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: PROPERTY_STATUSES,
      default: "draft",
      index: true,
    },

    rooms: {
      type: [RoomSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Export model safely for Next.js hot reload
 */
export const Property =
  models.Property || model("Property", PropertySchema);

export default Property;

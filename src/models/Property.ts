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

    // Additional listing fields modeled after OpenRent
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    propertyType: {
      type: String,
      enum: ['flat', 'house', 'maisonette', 'studio', 'room', 'other'],
      default: 'flat',
    },

    bedrooms: {
      type: Number,
      min: 0,
      default: 1,
    },

    bathrooms: {
      type: Number,
      min: 0,
      default: 1,
    },

    furnished: {
      type: String,
      enum: ['furnished', 'part-furnished', 'unfurnished', 'unknown'],
      default: 'unknown',
    },

    rentFrequency: {
      type: String,
      enum: ['pcm', 'pw'],
      default: 'pcm',
    },

    deposit: {
      type: Number,
      min: 0,
    },

    availabilityDate: {
      type: Date,
    },

    tenancyLengthMonths: {
      type: Number,
      min: 0,
    },

    billsIncluded: {
      type: [String],
      default: [],
    },

    petsAllowed: {
      type: Boolean,
      default: false,
    },

    smokingAllowed: {
      type: Boolean,
      default: false,
    },

    epcRating: {
      type: String,
      enum: ['A','B','C','D','E','F','G','unknown'],
      default: 'unknown',
    },

    councilTaxBand: {
      type: String,
      enum: ['A','B','C','D','E','F','G','H','unknown'],
      default: 'unknown',
    },

    sizeSqm: {
      type: Number,
      min: 0,
    },

    parking: {
      type: String,
      enum: ['none','on-street','off-street','garage','driveway','permit','other'],
      default: 'none',
    },

    amenities: {
      type: [String],
      default: [],
    },

    virtualTourUrl: {
      type: String,
      trim: true,
    },

    floor: {
      type: String,
      trim: true,
    },

    hmoLicenseRequired: {
      type: Boolean,
      default: false,
    },

    viewingInstructions: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: PROPERTY_STATUSES,
      default: "draft",
      index: true,
    },

    photos: {
      type: [PhotoSchema],
      default: [],
      validate: [(arr: any[]) => arr.length <= 20, 'Maximum 20 photos allowed per property'],
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
export interface PropertyDocument {
  _id?: any;
  landlordId: mongoose.Types.ObjectId;
  title: string;
  headline?: string;
  description?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    county?: string;
  };
  rentPcm: number;
  rentFrequency?: 'pcm' | 'pw';
  propertyType?: 'flat' | 'house' | 'maisonette' | 'studio' | 'room' | 'other';
  bedrooms?: number;
  bathrooms?: number;
  furnished?: 'furnished' | 'part-furnished' | 'unfurnished' | 'unknown';
  deposit?: number;
  availabilityDate?: Date;
  tenancyLengthMonths?: number;
  billsIncluded?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  epcRating?: string;
  councilTaxBand?: string;
  sizeSqm?: number;
  parking?: string;
  amenities?: string[];
  virtualTourUrl?: string;
  floor?: string;
  hmoLicenseRequired?: boolean;
  viewingInstructions?: string;
  photos?: { url: string; blobName: string }[];
  rooms?: any[];
  status?: PropertyStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export const Property =
  models.Property || model("Property", PropertySchema);

export default Property;

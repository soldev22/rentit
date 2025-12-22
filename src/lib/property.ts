// Fetch all listed properties for public property listings
export async function getAllPublicProperties(filters?: { city?: string; minRent?: number; maxRent?: number; rooms?: number }) {
  const propertiesCollection = await getCollection("properties");
  const query: any = { status: "listed" };
  if (filters?.city) {
    // simple case-insensitive substring match
    query["address.city"] = { $regex: filters.city, $options: "i" };
  }
  if (filters?.minRent !== undefined) {
    query.rentPcm = query.rentPcm || {};
    query.rentPcm.$gte = Number(filters.minRent);
  }
  if (filters?.maxRent !== undefined) {
    query.rentPcm = query.rentPcm || {};
    query.rentPcm.$lte = Number(filters.maxRent);
  }
  if (filters?.rooms !== undefined) {
    query.rooms = Number(filters.rooms);
  }

  const properties = await propertiesCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
  return properties.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    description: p.description,
    address: p.address,
    rentPcm: p.rentPcm,
    rooms: p.rooms,
    status: p.status,
    photos: (p.photos && p.photos.length > 0)
      ? p.photos
      : (p.rooms?.flatMap((r:any) => r.photos || []) || []),
  }));
}
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function getListedProperties() {
  const propertiesCollection = await getCollection("properties");
  const properties = await propertiesCollection
    .find({ status: "listed" })
    .sort({ createdAt: -1 })
    .toArray();
  return properties.map((p) => ({
    id: p._id.toString(),
    title: p.title,
    description: p.description,
    address: p.address,
    rentPcm: p.rentPcm,
    rooms: p.rooms,
    photos: (p.photos && p.photos.length > 0)
      ? p.photos
      : (p.rooms?.flatMap((r:any) => r.photos || []) || []),
  }));
}

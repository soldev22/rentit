// Fetch all listed properties for public property listings
export async function getAllPublicProperties() {
  const propertiesCollection = await getCollection("properties");
  const properties = await propertiesCollection
    .find({ status: "listed" })
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

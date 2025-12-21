import PropertyImageUpload from "../PropertyImageUpload";
import { useState } from "react";

export default function PropertyImageUploadOnCreate({ propertyId, onUploaded }: { propertyId: string, onUploaded: (photo: { url: string, blobName: string }) => void }) {
  // This is a wrapper for future extensibility, currently just reuses PropertyImageUpload
  return <PropertyImageUpload propertyId={propertyId} onUploaded={onUploaded} />;
}

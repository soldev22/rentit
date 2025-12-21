"use client";
import { useState } from "react";
import RegisterInterestButton from "./RegisterInterestButton";
import ImageModal from "./ImageModal";

import Link from "next/link";

export default function PropertyDetailClient({ property, propertyId }: { property: any, propertyId: string }) {
  const allPhotos = (property.photos && property.photos.length > 0)
    ? property.photos
    : (property.rooms?.flatMap((room: any) => room.photos || []) || []);
  const mainPhoto = allPhotos[0]?.url;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);

  function openModal(url: string) {
    setModalImg(url);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalImg(null);
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-xl mb-4">
        <Link
          href="/applicant/properties"
          className="inline-block mb-2 px-4 py-2 rounded bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition"
        >
          ← Back to Properties
        </Link>
      </div>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg overflow-hidden">
        {mainPhoto && (
          <img
            src={mainPhoto}
            alt={property.title}
            className="w-full h-64 object-cover cursor-pointer"
            style={{ objectPosition: 'center' }}
            onClick={() => openModal(mainPhoto)}
          />
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2 text-indigo-700">{property.title}</h1>
          <div className="text-slate-600 mb-1">{property.address.line1}, {property.address.city}, {property.address.postcode}</div>
          <div className="text-slate-800 font-semibold mb-2 text-lg">£{property.rentPcm} pcm</div>
          <div className="text-slate-500 text-base mb-4">{property.description}</div>
          {allPhotos.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ WebkitOverflowScrolling: 'touch' }}>
              {allPhotos.slice(1).map((photo: any, idx: number) => (
                <img
                  key={idx}
                  src={photo.url}
                  alt={property.title + " photo " + (idx + 2)}
                  className="w-20 h-20 object-cover rounded-md border cursor-pointer flex-shrink-0"
                  onClick={() => openModal(photo.url)}
                />
              ))}
            </div>
          )}
          <RegisterInterestButton propertyId={propertyId} />
        </div>
      </div>
      <ImageModal open={modalOpen} src={modalImg || ""} alt={property.title} onClose={closeModal} />
    </main>
  );
}

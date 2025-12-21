"use client";

import { useState } from "react";
import { canTransition } from "@/lib/propertyStatus";
import type { PropertyStatus } from "@/models/Property";

type Props = {
  propertyId: string;
  status: PropertyStatus;
  onStatusChange?: (newStatus: PropertyStatus) => void;
};

export default function LandlordPropertyActions({
  propertyId,
  status,
  onStatusChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(newStatus: PropertyStatus) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/landlord/properties/${propertyId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      onStatusChange?.(newStatus);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {canTransition(status, "listed") && (
        <button onClick={() => updateStatus("listed")} disabled={loading}>
          List property
        </button>
      )}

      {canTransition(status, "paused") && (
        <button onClick={() => updateStatus("paused")} disabled={loading}>
          Pause
        </button>
      )}

      {canTransition(status, "under_offer") && (
        <button onClick={() => updateStatus("under_offer")} disabled={loading}>
          Mark under offer
        </button>
      )}

      {error && (
        <span style={{ color: "red", fontSize: "0.85rem" }}>
          {error}
        </span>
      )}
    </div>
  );
}

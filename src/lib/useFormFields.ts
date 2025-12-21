import { useState } from "react";

/**
 * Generic hook for managing form fields and error/loading state.
 * @param initialFields An object with initial field values
 */
export function useFormFields<T extends Record<string, any>>(initialFields: T) {
  const [fields, setFields] = useState<T>(initialFields);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleFieldChange<K extends keyof T>(key: K, value: T[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function resetFields() {
    setFields(initialFields);
    setError("");
    setLoading(false);
  }

  return {
    fields,
    setFields,
    handleFieldChange,
    error,
    setError,
    loading,
    setLoading,
    resetFields,
  };
}

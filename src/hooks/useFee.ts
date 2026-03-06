import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/constants/api";

const DEFAULT_BASE_FEE = 0.71;
const FEE_PERCENT = 0.0035;

export function useFee() {
  const [baseFee, setBaseFee] = useState(DEFAULT_BASE_FEE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/fee`)
      .then((res) => res.json())
      .then((data) => {
        if (data.baseFee != null) setBaseFee(data.baseFee);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { baseFee, feePercent: FEE_PERCENT, isLoading, error };
}

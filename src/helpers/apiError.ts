import axios from "axios";

export function getApiErrorDetails(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return {
      status: null,
      message: error instanceof Error ? error.message : "Unknown error",
      data: null as unknown,
    };
  }

  return {
    status: error.response?.status ?? null,
    message: error.message,
    data: error.response?.data ?? null,
  };
}

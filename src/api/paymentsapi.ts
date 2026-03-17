import { Payment } from "../types/payment";
import { serverApi } from "./serverconfig";

type GetAllPaymentsParams = {
  page?: number;
  perPage?: number;
  createAt?: number;
  telegramUserId?: number;
};

type GetAllPaymentsResponse = {
  paymnets: Payment[];
};

export const GetAllLessons = async (params: GetAllPaymentsParams) => {
  const result = await serverApi.get<GetAllPaymentsResponse>("/payments", {
    params,
  });
  return result.data;
};

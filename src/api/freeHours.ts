import { FreeHour } from "../types/freeHour";

import { serverApi } from "./serverconfig";

type GetAllHouursParams = {
  page?: number;
  perPage?: number;
  fromDate?: string;
  toDate?: string;
};

interface CreateHourBody {
  location: string;
  duration: number;
  date: string;
}

type GetAllHourssResponse = {
  freeHours: FreeHour[];
};

export const GetFreeHours = async (params: GetAllHouursParams) => {
  const result = await serverApi.get<GetAllHourssResponse>("/free-hours", {
    params,
  });
  return result.data;
};

export const CreateFreeHour = async (body: CreateHourBody) => {
  const result = await serverApi.post<GetAllHourssResponse>(
    "/free-hours",
    body
  );
  return result.data;
};

export const createFreeHour = CreateFreeHour;

export const deleteFreeHour = async (freeHourId: string) => {
  await serverApi.delete(`/free-hours/${freeHourId}`);
};

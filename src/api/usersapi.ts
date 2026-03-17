import { User } from "../types/user";
import { serverApi } from "./serverconfig";

type GetAllUsersParams = {
  page?: number;
  perPage?: number;
  createAt?: number;
  telegramUserId?: string;
  userName?: string;
  fullName?: string;
  balance?: number;
  phoneNumber?: number;
  currency?: string;
};

type GetAllUsersRespons = {
  users: User[];
};

export const getAllUsers = async (params: GetAllUsersParams) => {
  const result = await serverApi.get<GetAllUsersRespons>("/users", { params });
  return result.data;
};

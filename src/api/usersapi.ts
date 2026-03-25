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

export type CreateUserBody = {
  telegramUserId: string;
  userName: string;
  fullName: string;
  phoneNumber: number;
  balance: number;
  currency: string;
};

export const getAllUsers = async (params: GetAllUsersParams) => {
  const result = await serverApi.get<GetAllUsersRespons>("/users", { params });
  return result.data;
};

export const getUserByTelegramId = async (telegramUserId: string) => {
  const result = await serverApi.get<User>(`/users/telegram/${telegramUserId}`);
  return result.data;
};

export const createUser = async (body: CreateUserBody) => {
  const result = await serverApi.post<User>("/users", body);
  return result.data;
};

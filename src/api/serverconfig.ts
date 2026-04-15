import axios from "axios";

export const serverApi = axios.create({ baseURL: "https://fmo3feijed.execute-api.eu-central-1.amazonaws.com" });

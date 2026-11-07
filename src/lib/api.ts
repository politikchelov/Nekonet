import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Fail over to AniList promptly instead of leaving the page waiting indefinitely.
  timeout: 9000,
});

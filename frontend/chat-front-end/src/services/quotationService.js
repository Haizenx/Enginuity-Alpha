import { axiosInstance } from "../lib/axios";

export const compareQuotation = async (items) => {
  // items: [{ itemId, quantity }]
  const { data } = await axiosInstance.post("/quotations/compare", { items });
  return data; // { results: [{ supplier, total }], best }
};



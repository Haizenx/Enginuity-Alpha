import { axiosInstance } from "../lib/axios";

export const fetchSuppliers = async () => {
  const { data } = await axiosInstance.get("/suppliers");
  return data;
};

export const createSupplier = async (payload) => {
  const { data } = await axiosInstance.post("/suppliers", payload);
  return data;
};

export const updateSupplier = async (id, payload) => {
  const { data } = await axiosInstance.put(`/suppliers/${id}`, payload);
  return data;
};

export const deleteSupplier = async (id) => {
  const { data } = await axiosInstance.delete(`/suppliers/${id}`);
  return data;
};

export const setItemSupplierPrice = async (itemId, payload) => {
  const { data } = await axiosInstance.post(`/items/${itemId}/supplier-price`, payload);
  return data;
};

export const getItemSupplierPrices = async (itemId) => {
  const { data } = await axiosInstance.get(`/items/${itemId}/supplier-prices`);
  return data;
};



import useUserStore from "@/shared/stores/user.store";
import { BASE_URL } from "@env";
// import { onInfo } from "@utils/toast";
import axios, { AxiosRequestConfig } from "axios";

const controller = new AbortController();

const api = axios.create({
  baseURL: BASE_URL,
  signal: controller.signal
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = useUserStore.getState().userToken;
    console.log("token", token, "token from store");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const setHeaderAuthorization: (token?: string) => void = (token) => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      api.defaults.headers.common.Authorization = undefined;
    }
  },
  postData: <T, D>(
    url: string,
    data?: T | undefined,
    options?: AxiosRequestConfig
  ) => TApiRequestResponseType<D> = (url, data, options) => {
    return api.post(url, data, options);
  },
  getData: <T>(
    url: string,
    options?: AxiosRequestConfig
  ) => TApiRequestResponseType<T> = (url, options) => {
    return api.get(url, options);
  },
  putData: <T, D>(
    url: string,
    data: T | undefined,
    options?: AxiosRequestConfig
  ) => TApiRequestResponseType<D> = (url, data, options) => {
    return api.put(url, data, options);
  },
  patchData: <T, D>(
    url: string,
    data: T | undefined,
    options?: AxiosRequestConfig
  ) => TApiRequestResponseType<D> = (url, data, options) => {
    return api.patch(url, data, options);
  },
  deleteData: <T>(
    url: string,
    options?: AxiosRequestConfig
  ) => TApiRequestResponseType<T | undefined> = (url, options) => {
    return api.delete(url, options);
  },
  abortOutgoingRequest = () => {
    controller.abort();
  };

export default api;

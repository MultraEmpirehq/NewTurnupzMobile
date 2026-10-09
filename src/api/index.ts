import useUserStore from "@/shared/stores/user.store";
import { BASE_URL } from "@env";
// import { onInfo } from "@utils/toast";
import axios, { AxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const controller = new AbortController();

const api = axios.create({
  baseURL: BASE_URL,
  signal: controller.signal,
  // Names this phone in the account's signed-in devices list.
  headers:
    Platform.OS === "web"
      ? undefined
      : { "X-Device-Name": Constants.deviceName ?? `${Platform.OS} phone` }
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // A session the API no longer accepts (signed out elsewhere, or the account
    // was suspended) sends the person back to sign-in instead of failing quietly.
    const sentToken = !!error?.config?.headers?.Authorization;
    if (error?.response?.status === 401 && sentToken) {
      useUserStore.getState().clearUserStore();
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = useUserStore.getState().userToken;
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

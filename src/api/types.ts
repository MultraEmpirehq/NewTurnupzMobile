import { AxiosError, AxiosResponse } from "axios";

declare global {
  export type TMetaLinkTypes = {
    url: null;
    label: string;
    active: false;
  };
  export type TMetaType = {
    nextLink: string | null;
    previousLink: string | null;
    presentLink: string;
  };

  export type TPaginationLinksType = {
    presentPage: number;
    total: number;
    limit: number;
    previousPage: number | null;
    nextPage: number | null;
    totalPage: number;
  };

  export type TResultPaginationType = {
    meta: TMetaType;
    pagination: TPaginationLinksType;
  };

  export type TApiCallResponseType<T> = {
    data: T;
  } & TResultPaginationType;

  export type TErrorResponseType = {
    message?: string;
    errors?: {
      [name: string]: string | string[];
    };
  };

  export type TApiRequestResponseType<T> = Promise<
    AxiosResponse<TApiCallResponseType<T>>
  >;

  export type TApiErrorResponseType = AxiosError<TErrorResponseType>;
}

export {};

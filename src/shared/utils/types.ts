import { TUser } from "../stores/user.store";

export enum EVerificationType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  FORGOT_PASSWORD = "FORGOT_PASSWORD",
  CHANGE_EMAIL = "CHANGE_EMAIL",
  CHANGE_MOBILE = "CHANGE_MOBILE",
  ACCOUNT_CREATION = "ACCOUNT_CREATION"
}

export type TUserCheckResponseType = {
  exists: string;
  isAccountDisabled: boolean;
  isEmailVerified: boolean;
  shouldRequestPassword: boolean;
};

export type TEventActivityDetailsType = {
  name: string;
  description?: string;
  date: Date;
};

export type TVenueDetailsType = {
  id: string;
  name: string;
  longitude?: number;
  latitude?: number;
  address: string;
  totalAvailableSeat: number;
  description?: string;
  creator?: TUser;
  images: string[];
};

export type TEventDetailsType = {
  id: string;
  name: string;
  date: Date;
  venue: TVenueDetailsType;
  image: string;
  totalTickets: number;
  description?: string;
  activities?: TEventActivityDetailsType[];
  additionalInformation?: string[];
  eventGuestsOfHonour?: ({ name: string } | TUser)[];
  performers?: { id: string; name: string; isVerified?: boolean }[];
  medias?: string[];
};

export type TTicketDetailsType = {
  id: string;
  event: TEventDetailsType;
  user: TUser;
  number: string;
  quantity: number;
  type: string;
  price: number;
  total: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TAuthBodyType = {
  email: string;
  password?: string;
};

export type TLoginResponseType = { accessToken: string; userDetails: TUser };

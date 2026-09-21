import { create } from "zustand";

export type TSavedPaymentCard = {
  id: string;
  brand: string;
  lastFour: string;
  expiry: string;
  holder: string;
};

export type TWalletTransaction = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  createdAt: string;
};

type TWalletStore = {
  cards: TSavedPaymentCard[];
  transactions: TWalletTransaction[];
  refundCredits: number;
  promotionalCredits: number;
  addCard: (card: TSavedPaymentCard) => void;
  updateCard: (card: TSavedPaymentCard) => void;
  removeCard: (cardId: string) => void;
  addTransaction: (transaction: TWalletTransaction) => void;
};

export const useWalletStore = create<TWalletStore>((set) => ({
  cards: [],
  transactions: [],
  refundCredits: 0,
  promotionalCredits: 0,
  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
  updateCard: (card) => set((state) => ({
    cards: state.cards.map((item) => item.id === card.id ? card : item)
  })),
  removeCard: (cardId) => set((state) => ({
    cards: state.cards.filter((card) => card.id !== cardId)
  })),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] }))
}));

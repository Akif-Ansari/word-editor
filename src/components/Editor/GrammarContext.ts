import { createContext } from "react";

export interface GrammarClickInfo {
  message: string;
  category: string;
  replacements: string[];
  rect: DOMRect;
  offset: number;
  length: number;
}

export const GrammarContext = createContext<{
  onGrammarClick: (info: GrammarClickInfo) => void;
} | null>(null);

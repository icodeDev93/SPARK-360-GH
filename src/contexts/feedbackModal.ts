import { createContext } from 'react';

export type FeedbackKind = 'success' | 'deleted';

export interface FeedbackOptions {
  title: string;
  message: string;
  buttonLabel?: string;
  kind?: FeedbackKind;
}

export interface FeedbackModalContextValue {
  showFeedback: (options: FeedbackOptions) => void;
}

export const FeedbackModalContext = createContext<FeedbackModalContextValue | null>(null);

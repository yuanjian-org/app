export type Updater<T> = (updater: (value: T) => void) => void;

export interface OpenAIListModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    root: string;
  }>;
}

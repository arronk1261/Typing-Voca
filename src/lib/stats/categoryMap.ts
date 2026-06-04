import rawWords from "@/data/words.json";
import { isWord, type Word } from "@/types";

const BUNDLED: Word[] = (rawWords as unknown[]).filter(isWord);

export const wordCategoryMap: Map<number, string> = new Map(
  BUNDLED.map((w) => [w.id, w.category]),
);

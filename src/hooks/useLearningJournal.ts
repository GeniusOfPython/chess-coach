import { useState } from "react";
import {
  addLearningJournalItem,
  type LearningJournalItem,
} from "../analysis/learningJournal";

export function useLearningJournal() {
  const [items, setItems] = useState<LearningJournalItem[]>([]);

  function addItem(item: LearningJournalItem) {
    setItems((currentItems) =>
      addLearningJournalItem(currentItems, item),
    );
  }

  function clearItems() {
    setItems([]);
  }

  return { items, addItem, clearItems };
}

import { expenseCategoriesRepository } from "@/lib/repositories";
import type { ExpenseCategoryFormInput } from "@/domain/schema/finance";

/**
 * The spec (§11) lists default expense categories every Jamia needs on
 * day one (utility bills, kitchen, student welfare, ...). There is no
 * Cloud Functions deploy step in this project to seed them server-side,
 * so an admin triggers this once from Settings — safe to run more than
 * once since it only adds categories, never duplicates or removes.
 */
export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryFormInput[] = [
  { name: "بجلی کا بل", group: "utilities" },
  { name: "گیس", group: "utilities" },
  { name: "پانی", group: "utilities" },
  { name: "انٹرنیٹ", group: "utilities" },
  { name: "دیگر یوٹیلیٹی", group: "utilities" },

  { name: "گروسری", group: "kitchen" },
  { name: "کچن گیس", group: "kitchen" },
  { name: "خوراک کا سامان", group: "kitchen" },
  { name: "کچن کا سامان", group: "kitchen" },
  { name: "دیگر کچن اخراجات", group: "kitchen" },

  { name: "طبی امداد", group: "student" },
  { name: "کپڑے", group: "student" },
  { name: "کتابیں", group: "student" },
  { name: "آمد و رفت", group: "student" },
  { name: "وظیفہ", group: "student" },
  { name: "ہنگامی امداد", group: "student" },

  { name: "عمارت کی مرمت", group: "other" },
  { name: "فرنیچر", group: "other" },
  { name: "دفتری اخراجات", group: "other" },
  { name: "تعلیمی سامان", group: "other" },
  { name: "پروگرامز و تقریبات", group: "other" },
  { name: "متفرق", group: "other" },
];

export async function seedDefaultExpenseCategories(existingNames: string[], actorUid: string): Promise<number> {
  const existing = new Set(existingNames.map((n) => n.trim()));
  const missing = DEFAULT_EXPENSE_CATEGORIES.filter((c) => !existing.has(c.name));
  for (const category of missing) {
    await expenseCategoriesRepository.create({ ...category, isDefault: true }, actorUid);
  }
  return missing.length;
}

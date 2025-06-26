import { db } from "./db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

const defaultCategories = [
  { name: "Commercial", slug: "commercial", displayOrder: 0 },
  { name: "Documentary", slug: "documentary", displayOrder: 1 },
  { name: "Music Video", slug: "music-video", displayOrder: 2 },
  { name: "Corporate", slug: "corporate", displayOrder: 3 },
  { name: "Social Media", slug: "social-media", displayOrder: 4 },
  { name: "Fashion", slug: "fashion", displayOrder: 5 },
  { name: "Sports", slug: "sports", displayOrder: 6 },
  { name: "Animation", slug: "animation", displayOrder: 7 },
  { name: "Experimental", slug: "experimental", displayOrder: 8 },
  { name: "Events", slug: "events", displayOrder: 9 },
  { name: "Other", slug: "other", displayOrder: 10 },
];

export async function migrateDefaultCategories() {
  try {
    console.log("Starting category migration...");
    
    for (const category of defaultCategories) {
      // Check if category already exists
      const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, category.slug))
        .limit(1);
      
      if (!existing) {
        await db.insert(categories).values(category);
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }
    
    console.log("Category migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Category migration failed:", error);
    return false;
  }
}

// CLI script to run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDefaultCategories()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
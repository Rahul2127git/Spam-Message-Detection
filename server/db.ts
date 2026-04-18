import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, predictions, analytics, InsertPrediction, Analytics } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createPrediction(prediction: InsertPrediction) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create prediction: database not available");
    return null;
  }

  try {
    const result = await db.insert(predictions).values(prediction);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create prediction:", error);
    throw error;
  }
}

export async function getPredictions(limit: number = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get predictions: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(predictions)
      .orderBy(desc(predictions.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get predictions:", error);
    return [];
  }
}

export async function getOrCreateAnalytics(): Promise<Analytics | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get analytics: database not available");
    return null;
  }

  try {
    const result = await db.select().from(analytics).limit(1);
    if (result.length > 0) {
      return result[0];
    }

    // Create default analytics record
    await db.insert(analytics).values({
      totalPredictions: 0,
      spamCount: 0,
      hamCount: 0,
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      accuracy: "0.95",
      smsTotal: 0,
      emailTotal: 0,
      spamPercentage: "0",
    });

    const newResult = await db.select().from(analytics).limit(1);
    return newResult.length > 0 ? newResult[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get or create analytics:", error);
    return null;
  }
}

export async function updateAnalytics(updates: Partial<Analytics>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update analytics: database not available");
    return null;
  }

  try {
    const analyticsRecord = await getOrCreateAnalytics();
    if (!analyticsRecord) return null;

    const result = await db
      .update(analytics)
      .set(updates)
      .where(eq(analytics.id, analyticsRecord.id));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update analytics:", error);
    throw error;
  }
}

import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { policies } from "../schema.js";
import type { DrizzleDb } from "../index.js";
import type { Policy, PolicyScope, PolicyRule } from "../../types.js";

export class PoliciesRepository {
  constructor(private db: DrizzleDb) {}

  async findAll(): Promise<Policy[]> {
    const rows = await this.db.select().from(policies).orderBy(desc(policies.priority));

    return rows.map((row) => ({
      id: row.id,
      scope: row.scopeValue as PolicyScope,
      rules: row.rules as PolicyRule[],
      priority: row.priority,
    }));
  }

  async findByScopeType(scopeType: string): Promise<Policy[]> {
    const rows = await this.db
      .select()
      .from(policies)
      .where(eq(policies.scopeType, scopeType))
      .orderBy(desc(policies.priority));

    return rows.map((row) => ({
      id: row.id,
      scope: row.scopeValue as PolicyScope,
      rules: row.rules as PolicyRule[],
      priority: row.priority,
    }));
  }

  async create(data: {
    scope: PolicyScope;
    rules: PolicyRule[];
    priority: number;
  }): Promise<string> {
    const id = uuid();
    await this.db.insert(policies).values({
      id,
      scopeType: data.scope.type,
      scopeValue: data.scope,
      rules: data.rules,
      priority: data.priority,
      createdAt: new Date(),
    });
    return id;
  }

  async findById(id: string): Promise<Policy | null> {
    const rows = await this.db.select().from(policies).where(eq(policies.id, id));
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      scope: row.scopeValue as PolicyScope,
      rules: row.rules as PolicyRule[],
      priority: row.priority,
    };
  }
}

export function createPoliciesRepository(db: DrizzleDb) {
  return new PoliciesRepository(db);
}

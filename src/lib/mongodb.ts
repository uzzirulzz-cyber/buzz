import { MongoClient, Db } from "mongodb";
const uri = process.env.MONGODB_URI || "mongodb+srv://crypto:admin11122@ghar.ahbfod0.mongodb.net/?appName=ghar";
const dbName = "blockexchange";
let client: MongoClient | null = null;
let db: Db | null = null;
export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  if (!client) { client = new MongoClient(uri); await client.connect(); }
  db = client.db(dbName);
  return db;
}

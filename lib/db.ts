import { MongoClient, Db } from "mongodb";

const getMongoUri = () => {
  return process.env.DATABASE_URI || process.env.MONGODB_URI;
};

const getTenantDbName = () => process.env.TENANT_DB_NAME;

const isPlaceholderMongoUri = (uri?: string) =>
  !uri ||
  uri.includes("<user>") ||
  uri.includes("<password>") ||
  uri.includes("@cluster.mongodb.net");

let cachedClient = (global as any).mongoClient;

if (!cachedClient) {
  cachedClient = (global as any).mongoClient = { conn: null, promise: null };
}

export async function connectClient(): Promise<MongoClient> {
  if (cachedClient.conn) return cachedClient.conn;

  if (!cachedClient.promise) {
    const mongoUri = getMongoUri();

    if (isPlaceholderMongoUri(mongoUri)) {
      throw new Error(
        "Please set DATABASE_URI or MONGODB_URI to a real MongoDB connection string. The current value is still using the sample Atlas host.",
      );
    }

    cachedClient.promise = MongoClient.connect(mongoUri as string, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cachedClient.conn = await cachedClient.promise;
    console.log("✅ DB Connected Successfully");
  } catch (e) {
    cachedClient.promise = null;
    throw e;
  }

  return cachedClient.conn;
}

export async function connectMasterDB(): Promise<Db> {
  const client = await connectClient();
  return client.db("kalp_master");
}

export async function connectTenantDB(): Promise<Db> {
  const tenantDbName = getTenantDbName();

  if (!tenantDbName) {
    throw new Error(
      "Please define the TENANT_DB_NAME environment variable inside .env or .env.local",
    );
  }

  const client = await connectClient();
  return client.db(tenantDbName);
}

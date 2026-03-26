import { drizzle } from "drizzle-orm/mysql2";
import { schema } from "../drizzle/schema";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
});

export const db = drizzle({ client: connection as any, schema });

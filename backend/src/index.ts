import {db} from "./db";

console.log("Server starting...");

db.prepare("INSERT INTO transactions (title, amount) VALUES (?, ?)")
  .run("Test", 100);

const rows = db.prepare("SELECT * FROM transactions").all();

console.log(rows);
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcrypt";

const DB_PATH =
    process.env.DB_PATH || path.join(process.cwd(), "../budget-cluster.db");

export const db = new Database(DB_PATH);

export function seedUser8() {
    // ── User ────────────────────────────────────────────────────────────
    const hashedPassword = bcrypt.hashSync("passwort123", 10);
    db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, password)
    VALUES (8, 'Florian', 'f@gmail.com', ?)
  `).run(hashedPassword);

    // ── Transactions ─────────────────────────────────────────────────────
    // Delete existing first to avoid duplicates on re-run
    db.prepare(`DELETE FROM transactions WHERE user_id = 8`).run();

    const insertTx = db.prepare(`
    INSERT INTO transactions (user_id, name, amount, type, category, date)
    VALUES (8, ?, ?, ?, ?, ?)
  `);

    // Helper: generate ~realistic monthly data for 2025 + 2026
    const months2025 = [
        // Jan 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-01-01" },
        { name: "Freelance Project",amount: 420,  type: "income",  category: "Freelance",     date: "2025-01-15" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-01-02" },
        { name: "Groceries",        amount: 185,  type: "expense", category: "Food",          date: "2025-01-08" },
        { name: "Supermarket",      amount: 97,   type: "expense", category: "Food",          date: "2025-01-20" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-01-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-01-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-01-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-01-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-01-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-01-10" },
        { name: "Clothing",         amount: 64,   type: "expense", category: "Shopping",      date: "2025-01-18" },

        // Feb 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-02-01" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-02-02" },
        { name: "Groceries",        amount: 162,  type: "expense", category: "Food",          date: "2025-02-07" },
        { name: "Restaurant",       amount: 48,   type: "expense", category: "Food",          date: "2025-02-14" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-02-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-02-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-02-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-02-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-02-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-02-10" },
        { name: "Doctor visit",     amount: 25,   type: "expense", category: "Health",        date: "2025-02-20" },

        // Mar 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-03-01" },
        { name: "Freelance Project",amount: 600,  type: "income",  category: "Freelance",     date: "2025-03-22" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-03-02" },
        { name: "Groceries",        amount: 195,  type: "expense", category: "Food",          date: "2025-03-09" },
        { name: "Supermarket",      amount: 88,   type: "expense", category: "Food",          date: "2025-03-22" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-03-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-03-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-03-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-03-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-03-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-03-10" },
        { name: "Books",            amount: 42,   type: "expense", category: "Education",     date: "2025-03-15" },

        // Apr 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-04-01" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-04-02" },
        { name: "Groceries",        amount: 170,  type: "expense", category: "Food",          date: "2025-04-08" },
        { name: "Restaurant",       amount: 62,   type: "expense", category: "Food",          date: "2025-04-19" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-04-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-04-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-04-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-04-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-04-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-04-10" },
        { name: "Easter trip",      amount: 210,  type: "expense", category: "Travel",        date: "2025-04-18" },

        // May 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-05-01" },
        { name: "Freelance Project",amount: 380,  type: "income",  category: "Freelance",     date: "2025-05-10" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-05-02" },
        { name: "Groceries",        amount: 188,  type: "expense", category: "Food",          date: "2025-05-07" },
        { name: "Supermarket",      amount: 74,   type: "expense", category: "Food",          date: "2025-05-21" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-05-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-05-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-05-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-05-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-05-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-05-10" },
        { name: "Online course",    amount: 79,   type: "expense", category: "Education",     date: "2025-05-14" },

        // Jun 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-06-01" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-06-02" },
        { name: "Groceries",        amount: 200,  type: "expense", category: "Food",          date: "2025-06-06" },
        { name: "Restaurant",       amount: 75,   type: "expense", category: "Food",          date: "2025-06-21" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-06-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-06-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-06-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-06-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-06-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-06-10" },
        { name: "Summer clothing",  amount: 130,  type: "expense", category: "Shopping",      date: "2025-06-15" },
        { name: "Concert tickets",  amount: 60,   type: "expense", category: "Entertainment", date: "2025-06-28" },

        // Jul 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-07-01" },
        { name: "Bonus",            amount: 500,  type: "income",  category: "Salary",        date: "2025-07-15" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-07-02" },
        { name: "Groceries",        amount: 175,  type: "expense", category: "Food",          date: "2025-07-08" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-07-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-07-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-07-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-07-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-07-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-07-10" },
        { name: "Summer vacation",  amount: 890,  type: "expense", category: "Travel",        date: "2025-07-20" },

        // Aug 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-08-01" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-08-02" },
        { name: "Groceries",        amount: 168,  type: "expense", category: "Food",          date: "2025-08-09" },
        { name: "Restaurant",       amount: 55,   type: "expense", category: "Food",          date: "2025-08-17" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-08-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-08-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-08-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-08-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-08-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-08-10" },
        { name: "Pharmacy",         amount: 38,   type: "expense", category: "Health",        date: "2025-08-22" },

        // Sep 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-09-01" },
        { name: "Freelance Project",amount: 550,  type: "income",  category: "Freelance",     date: "2025-09-18" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-09-02" },
        { name: "Groceries",        amount: 192,  type: "expense", category: "Food",          date: "2025-09-06" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-09-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-09-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-09-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-09-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-09-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-09-10" },
        { name: "New shoes",        amount: 89,   type: "expense", category: "Shopping",      date: "2025-09-14" },
        { name: "Books",            amount: 35,   type: "expense", category: "Education",     date: "2025-09-25" },

        // Oct 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-10-01" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-10-02" },
        { name: "Groceries",        amount: 205,  type: "expense", category: "Food",          date: "2025-10-08" },
        { name: "Restaurant",       amount: 68,   type: "expense", category: "Food",          date: "2025-10-24" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-10-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-10-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-10-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-10-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-10-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-10-10" },
        { name: "Winter jacket",    amount: 149,  type: "expense", category: "Shopping",      date: "2025-10-18" },
        { name: "Car repair",       amount: 220,  type: "expense", category: "Transport",     date: "2025-10-28" },

        // Nov 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-11-01" },
        { name: "Freelance Project",amount: 700,  type: "income",  category: "Freelance",     date: "2025-11-12" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-11-02" },
        { name: "Groceries",        amount: 182,  type: "expense", category: "Food",          date: "2025-11-07" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-11-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-11-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-11-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-11-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-11-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-11-10" },
        { name: "Black Friday",     amount: 315,  type: "expense", category: "Shopping",      date: "2025-11-28" },

        // Dec 2025
        { name: "Salary",           amount: 2850, type: "income",  category: "Salary",        date: "2025-12-01" },
        { name: "Christmas bonus",  amount: 1200, type: "income",  category: "Salary",        date: "2025-12-15" },
        { name: "Rent",             amount: 780,  type: "expense", category: "Housing",       date: "2025-12-02" },
        { name: "Groceries",        amount: 240,  type: "expense", category: "Food",          date: "2025-12-06" },
        { name: "Christmas dinner", amount: 110,  type: "expense", category: "Food",          date: "2025-12-24" },
        { name: "Netflix",          amount: 15,   type: "expense", category: "Entertainment", date: "2025-12-05" },
        { name: "Spotify",          amount: 10,   type: "expense", category: "Entertainment", date: "2025-12-05" },
        { name: "Gym",              amount: 35,   type: "expense", category: "Health",        date: "2025-12-06" },
        { name: "Train pass",       amount: 55,   type: "expense", category: "Transport",     date: "2025-12-03" },
        { name: "Phone bill",       amount: 20,   type: "expense", category: "Utilities",     date: "2025-12-10" },
        { name: "Internet",         amount: 30,   type: "expense", category: "Utilities",     date: "2025-12-10" },
        { name: "Christmas gifts",  amount: 380,  type: "expense", category: "Shopping",      date: "2025-12-20" },
        { name: "New Year's Eve",   amount: 85,   type: "expense", category: "Entertainment", date: "2025-12-31" },
    ];

    const months2026 = [
        // Jan 2026
        { name: "Salary",           amount: 3000, type: "income",  category: "Salary",        date: "2026-01-01" },
        { name: "Rent",             amount: 800,  type: "expense", category: "Housing",       date: "2026-01-02" },
        { name: "Groceries",        amount: 178,  type: "expense", category: "Food",          date: "2026-01-08" },
        { name: "Restaurant",       amount: 52,   type: "expense", category: "Food",          date: "2026-01-17" },
        { name: "Netflix",          amount: 18,   type: "expense", category: "Entertainment", date: "2026-01-05" },
        { name: "Spotify",          amount: 11,   type: "expense", category: "Entertainment", date: "2026-01-05" },
        { name: "Gym",              amount: 40,   type: "expense", category: "Health",        date: "2026-01-06" },
        { name: "Train pass",       amount: 60,   type: "expense", category: "Transport",     date: "2026-01-03" },
        { name: "Phone bill",       amount: 22,   type: "expense", category: "Utilities",     date: "2026-01-10" },
        { name: "Internet",         amount: 32,   type: "expense", category: "Utilities",     date: "2026-01-10" },
        { name: "New Year gear",    amount: 95,   type: "expense", category: "Shopping",      date: "2026-01-12" },

        // Feb 2026
        { name: "Salary",           amount: 3000, type: "income",  category: "Salary",        date: "2026-02-01" },
        { name: "Freelance Project",amount: 480,  type: "income",  category: "Freelance",     date: "2026-02-20" },
        { name: "Rent",             amount: 800,  type: "expense", category: "Housing",       date: "2026-02-02" },
        { name: "Groceries",        amount: 155,  type: "expense", category: "Food",          date: "2026-02-07" },
        { name: "Valentine dinner", amount: 72,   type: "expense", category: "Food",          date: "2026-02-14" },
        { name: "Netflix",          amount: 18,   type: "expense", category: "Entertainment", date: "2026-02-05" },
        { name: "Spotify",          amount: 11,   type: "expense", category: "Entertainment", date: "2026-02-05" },
        { name: "Gym",              amount: 40,   type: "expense", category: "Health",        date: "2026-02-06" },
        { name: "Train pass",       amount: 60,   type: "expense", category: "Transport",     date: "2026-02-03" },
        { name: "Phone bill",       amount: 22,   type: "expense", category: "Utilities",     date: "2026-02-10" },
        { name: "Internet",         amount: 32,   type: "expense", category: "Utilities",     date: "2026-02-10" },

        // Mar 2026
        { name: "Salary",           amount: 3000, type: "income",  category: "Salary",        date: "2026-03-01" },
        { name: "Rent",             amount: 800,  type: "expense", category: "Housing",       date: "2026-03-02" },
        { name: "Groceries",        amount: 198,  type: "expense", category: "Food",          date: "2026-03-09" },
        { name: "Netflix",          amount: 18,   type: "expense", category: "Entertainment", date: "2026-03-05" },
        { name: "Spotify",          amount: 11,   type: "expense", category: "Entertainment", date: "2026-03-05" },
        { name: "Gym",              amount: 40,   type: "expense", category: "Health",        date: "2026-03-06" },
        { name: "Train pass",       amount: 60,   type: "expense", category: "Transport",     date: "2026-03-03" },
        { name: "Phone bill",       amount: 22,   type: "expense", category: "Utilities",     date: "2026-03-10" },
        { name: "Internet",         amount: 32,   type: "expense", category: "Utilities",     date: "2026-03-10" },
        { name: "Online course",    amount: 99,   type: "expense", category: "Education",     date: "2026-03-18" },
        { name: "Books",            amount: 47,   type: "expense", category: "Education",     date: "2026-03-25" },

        // Apr 2026
        { name: "Salary",           amount: 3000, type: "income",  category: "Salary",        date: "2026-04-01" },
        { name: "Freelance Project",amount: 620,  type: "income",  category: "Freelance",     date: "2026-04-14" },
        { name: "Rent",             amount: 800,  type: "expense", category: "Housing",       date: "2026-04-02" },
        { name: "Groceries",        amount: 172,  type: "expense", category: "Food",          date: "2026-04-06" },
        { name: "Restaurant",       amount: 66,   type: "expense", category: "Food",          date: "2026-04-20" },
        { name: "Netflix",          amount: 18,   type: "expense", category: "Entertainment", date: "2026-04-05" },
        { name: "Spotify",          amount: 11,   type: "expense", category: "Entertainment", date: "2026-04-05" },
        { name: "Gym",              amount: 40,   type: "expense", category: "Health",        date: "2026-04-06" },
        { name: "Train pass",       amount: 60,   type: "expense", category: "Transport",     date: "2026-04-03" },
        { name: "Phone bill",       amount: 22,   type: "expense", category: "Utilities",     date: "2026-04-10" },
        { name: "Internet",         amount: 32,   type: "expense", category: "Utilities",     date: "2026-04-10" },
        { name: "Spring trip",      amount: 245,  type: "expense", category: "Travel",        date: "2026-04-17" },

        // May 2026
        { name: "Salary",           amount: 3000, type: "income",  category: "Salary",        date: "2026-05-01" },
        { name: "Rent",             amount: 800,  type: "expense", category: "Housing",       date: "2026-05-02" },
        { name: "Groceries",        amount: 185,  type: "expense", category: "Food",          date: "2026-05-07" },
        { name: "Supermarket",      amount: 82,   type: "expense", category: "Food",          date: "2026-05-19" },
        { name: "Netflix",          amount: 18,   type: "expense", category: "Entertainment", date: "2026-05-05" },
        { name: "Spotify",          amount: 11,   type: "expense", category: "Entertainment", date: "2026-05-05" },
        { name: "Gym",              amount: 40,   type: "expense", category: "Health",        date: "2026-05-06" },
        { name: "Train pass",       amount: 60,   type: "expense", category: "Transport",     date: "2026-05-03" },
        { name: "Phone bill",       amount: 22,   type: "expense", category: "Utilities",     date: "2026-05-10" },
        { name: "Internet",         amount: 32,   type: "expense", category: "Utilities",     date: "2026-05-10" },
        { name: "Bike repair",      amount: 55,   type: "expense", category: "Transport",     date: "2026-05-22" },
    ];

    const allTransactions = [...months2025, ...months2026];
    for (const tx of allTransactions) {
        insertTx.run(tx.name, tx.amount, tx.type, tx.category, tx.date);
    }

    // ── Savings goals ────────────────────────────────────────────────────
    db.prepare(`DELETE FROM deposits WHERE goal_id IN (SELECT id FROM savings_goals WHERE user_id = 8)`).run();
    db.prepare(`DELETE FROM savings_goals WHERE user_id = 8`).run();

    const insertGoal = db.prepare(`
    INSERT INTO savings_goals (id, user_id, name, description, target_amount, current_amount, auto_save, monthly_rate, target_date, color_class)
    VALUES (?, 8, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insertGoal.run("u8-goal-1", "Emergency Fund",   "3 months salary as reserve", 9000,  5400, 1, 300, "2026-12-01", "color-violet");
    insertGoal.run("u8-goal-2", "New Laptop",        "MacBook Pro M4",             2500,  800,  0, null, "2026-09-01", "color-blue");
    insertGoal.run("u8-goal-3", "Summer Vacation",   "Croatia 2026",               1800,  1200, 1, 200, "2026-07-01", "color-rose");
    insertGoal.run("u8-goal-4", "Investment Buffer", "Start ETF portfolio",        5000,  650,  0, null, null,         "color-green");

    const insertDeposit = db.prepare(`INSERT INTO deposits (goal_id, date, amount) VALUES (?, ?, ?)`);
    // Emergency fund deposits
    for (const [d, a] of [
        ["2026-05-01", 300], ["2026-04-01", 300], ["2026-03-01", 300],
        ["2026-02-01", 300], ["2026-01-01", 300], ["2025-12-01", 300],
        ["2025-11-01", 300], ["2025-10-01", 300], ["2025-09-01", 300],
        ["2025-08-01", 300], ["2025-07-01", 300], ["2025-06-01", 300],
        ["2025-05-01", 300], ["2025-04-01", 300], ["2025-03-01", 300],
        ["2025-02-01", 300], ["2025-01-01", 300], ["2024-12-01", 300],
    ]) { insertDeposit.run("u8-goal-1", d, a); }
    // Laptop deposits
    for (const [d, a] of [
        ["2026-04-10", 200], ["2026-03-10", 200], ["2026-02-10", 200], ["2026-01-10", 200],
    ]) { insertDeposit.run("u8-goal-2", d, a); }
    // Vacation deposits
    for (const [d, a] of [
        ["2026-05-01", 200], ["2026-04-01", 200], ["2026-03-01", 200],
        ["2026-02-01", 200], ["2026-01-01", 200], ["2025-12-01", 200],
    ]) { insertDeposit.run("u8-goal-3", d, a); }
    // Investment deposits
    insertDeposit.run("u8-goal-4", "2026-03-01", 350);
    insertDeposit.run("u8-goal-4", "2026-04-01", 300);

    // ── Notes ────────────────────────────────────────────────────────────
    db.prepare(`DELETE FROM notes WHERE user_id = 8`).run();

    const now = new Date().toISOString();
    const insertNote = db.prepare(`
    INSERT INTO notes (id, user_id, title, content, category, is_favorite, created_at, updated_at)
    VALUES (?, 8, ?, ?, ?, ?, ?, ?)
  `);

    insertNote.run("u8-note-1", "Tax return 2025",
        "<b>Documents needed:</b><br>- Wage tax certificate<br>- Insurance statements<br>- Work-from-home days: 48<br>- Training costs: €178",
        "Rechnungen", 1, now, now);

    insertNote.run("u8-note-2", "ETF Strategy",
        "<b>Monthly: €300</b><br>- 70% MSCI World (IE00B4L5Y983)<br>- 20% Emerging Markets<br>- 10% Global Bonds<br><br>Rebalance quarterly.",
        "Sparpläne", 1, now, now);

    insertNote.run("u8-note-3", "Croatia Trip Planning",
        "Dates: 12–22 July 2026<br>Flight: check Ryanair / Wizz<br>Accommodation: Split or Hvar<br>Budget: €1,800 total",
        "Ideen", 0, now, now);

    insertNote.run("u8-note-4", "Subscriptions overview",
        "<b>Monthly:</b><br>- Netflix: €18<br>- Spotify: €11<br>- Gym: €40<br>- Cloud storage: €3<br><br><b>Annual:</b><br>- Domain: €15/y",
        "Rechnungen", 0, now, now);

    insertNote.run("u8-note-5", "Salary negotiation notes",
        "Current: €3,000 gross<br>Target: €3,400 by Jan 2027<br>Arguments: +2 projects delivered, certification done",
        "Ideen", 0, now, now);

    console.log("✅ User 8 seed data inserted successfully");
}

seedUser8();
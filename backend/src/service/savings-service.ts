import { supabase } from '../supabase';

export class SavingsService {
  public async getAll(userId: number) {
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('*, deposits(*)')
      .eq('user_id', userId);

    return (goals ?? []).map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      autoSave: !!g.auto_save,
      monthlyRate: g.monthly_rate,
      targetDate: g.target_date,
      colorClass: g.color_class,
      deposits: (g.deposits ?? []).map((d: any) => ({ date: d.date, amount: d.amount }))
    }));
  }

  public async create(userId: number, body: any) {
    const { id, name, description, targetAmount, autoSave, monthlyRate, targetDate, colorClass } = body;
    await supabase.from('savings_goals').insert({
      id, user_id: userId, name,
      description: description ?? null,
      target_amount: targetAmount,
      current_amount: 0,
      auto_save: autoSave ? true : false,
      monthly_rate: monthlyRate ?? null,
      target_date: targetDate ?? null,
      color_class: colorClass
    });
    return id;
  }

  public async update(id: string, userId: number, body: any) {
    const { data: owner } = await supabase
      .from('savings_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    const { name, description, targetAmount, autoSave, monthlyRate, targetDate, colorClass } = body;
    await supabase.from('savings_goals').update({
      name,
      description: description ?? null,
      target_amount: targetAmount,
      auto_save: autoSave ? true : false,
      monthly_rate: monthlyRate ?? null,
      target_date: targetDate ?? null,
      color_class: colorClass
    }).eq('id', id);
    return true;
  }

  public async delete(id: string, userId: number) {
    const { data: owner } = await supabase
      .from('savings_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    await supabase.from('deposits').delete().eq('goal_id', id);
    await supabase.from('savings_goals').delete().eq('id', id);
    return true;
  }

  public async addDeposit(goalId: string, userId: number, amount: number) {
    const { data: owner } = await supabase
      .from('savings_goals')
      .select('id, current_amount, name')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    const date = new Date().toISOString().split('T')[0];

    // Einzahlung in deposits speichern
    await supabase.from('deposits').insert({ goal_id: goalId, date, amount });

    // current_amount aktualisieren
    await supabase.from('savings_goals')
      .update({ current_amount: owner.current_amount + amount })
      .eq('id', goalId);

    // Automatisch eine Transaktion in Ein-Ausgaben erstellen
    await supabase.from('transactions').insert({
      user_id:  userId,
      name:     `Savings: ${owner.name}`,
      date:     date,
      amount:   amount,
      type:     'expense',
      category: 'Savings'
    });

    return true;
  }
}






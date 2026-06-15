import { supabase } from '../supabase';

export class BudgetService {
  public async getAll(userId: number) {
  console.log('getAll called with userId:', userId);
  
  const { data: transactions, error } = await supabase
  .from('transactions')
  .select('*, transaction_tags(tags(id, name))')
  .eq('user_id', userId)
  .order('date', { ascending: false });
  
  console.log('Supabase result:', transactions?.length, 'error:', error);

  return (transactions ?? []).map(t => {
    const tagNames = t.transaction_tags?.map((tt: any) => tt.tags?.name).filter(Boolean) ?? [];
    return {
      id: t.id,
      name: t.name,
      date: t.date,
      amount: t.amount,
      type: t.type,
      category: t.category,
      tags: tagNames.length > 0 ? tagNames : (t.category ? [t.category] : [])
    };
  });
  }

  public async create(body: any) {
    const { user_id, name, date, amount, type, tags, category } = body;
    const finalCategory = category ?? (tags?.[0] || 'Bank');

    const { data: transaction } = await supabase
      .from('transactions')
      .insert({ user_id, name, date, amount, type, category: finalCategory })
      .select()
      .single();

    if (transaction && tags?.length) {
      await this.saveTags(transaction.id, user_id, tags);
    }
    return transaction?.id;
  }

  public async update(id: number, userId: number, body: any) {
    const { data: owner } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    const { name, date, amount, type, tags, category } = body;
    const finalCategory = category ?? (tags?.[0] || 'Bank');

    await supabase
      .from('transactions')
      .update({ name, date, amount, type, category: finalCategory })
      .eq('id', id);

    await supabase.from('transaction_tags').delete().eq('transaction_id', id);
    if (tags?.length) await this.saveTags(id, userId, tags);
    return true;
  }

  public async delete(id: number, userId: number) {
    const { data: owner } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    await supabase.from('transaction_tags').delete().eq('transaction_id', id);
    await supabase.from('transactions').delete().eq('id', id);
    return true;
  }

  private async saveTags(transactionId: number, userId: number, tags: string[]) {
    for (const tagName of tags) {
      if (!tagName || tagName.trim() === '') continue;

      let { data: tag } = await supabase
        .from('tags')
        .select('id')
        .ilike('name', tagName)
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .single();

      if (!tag) {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ name: tagName, color: 'tag-blue', user_id: userId })
          .select()
          .single();
        tag = newTag;
      }

      if (tag) {
        await supabase
          .from('transaction_tags')
          .upsert({ transaction_id: transactionId, tag_id: tag.id });
      }
    }
  }
}
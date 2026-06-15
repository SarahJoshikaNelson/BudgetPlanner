import { supabase } from '../supabase';

export class NoteService {
  public async getAll(userId: number) {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    return (data ?? []).map(this.mapNote);
  }

  public async getById(id: string) {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    return data ? this.mapNote(data) : null;
  }

  public async create(userId: number, body: any) {
    const { id, title, content, category } = body;
    const now = new Date().toISOString();
    await supabase.from('notes').insert({
      id, user_id: userId, title,
      content: content ?? '',
      category: category ?? 'Ideen',
      is_favorite: false,
      created_at: now,
      updated_at: now
    });
    return id;
  }

  public async update(id: string, userId: number, body: any) {
    const { data: owner } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    const fields: any = { updated_at: new Date().toISOString() };
    if (body.title      !== undefined) fields.title       = body.title;
    if (body.content    !== undefined) fields.content     = body.content;
    if (body.category   !== undefined) fields.category    = body.category;
    if (body.isFavorite !== undefined) fields.is_favorite = body.isFavorite;

    await supabase.from('notes').update(fields).eq('id', id);
    return true;
  }

  public async delete(id: string, userId: number) {
    const { data: owner } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!owner) return false;

    await supabase.from('notes').delete().eq('id', id);
    return true;
  }

  private mapNote(n: any) {
    return {
      id:         n.id,
      title:      n.title,
      content:    n.content,
      category:   n.category,
      isFavorite: !!n.is_favorite,
      createdAt:  n.created_at,
      updatedAt:  n.updated_at,
    };
  }
}
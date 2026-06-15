import { supabase } from '../supabase'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';

export class AuthService {
  public async register(username: string, email: string, password: string): Promise<boolean> {
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    console.log('Existing:', existing, 'Check error:', checkError);

    if (existing) return false;

    const hashedPwd = bcrypt.hashSync(password, 10);
    const { error } = await supabase
      .from('users')
      .insert({ name: username, email, password: hashedPwd });

    console.log('Insert error:', error);
    return !error;
  }

  public async login(email: string, password: string) {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, password, profile_color')
      .eq('email', email)
      .single();

    if (!user || !bcrypt.compareSync(password, user.password)) return null;

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt
    });

    const { exp } = jwt.decode(accessToken) as { exp: number };

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'user',
      profile_color: user.profile_color ?? '#7B50DC',
      accessToken,
      refreshToken,
      expiresAt: new Date(exp * 1000)
    };
  }

  public async refresh(refreshToken: string) {
    const { data: row } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', refreshToken)
      .single();

    if (!row) return null;

    if (new Date(row.expires_at) < new Date()) {
      await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
      return null;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', row.user_id)
      .single();

    if (!user) return null;

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return { accessToken };
  }

  public async logout(refreshToken: string): Promise<void> {
    await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
  }

  public async updateProfileColor(userId: number, color: string): Promise<void> {
    await supabase
      .from('users')
      .update({ profile_color: color })
      .eq('id', userId);
  }
}
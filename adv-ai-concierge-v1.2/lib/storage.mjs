import { randomBytes, createHash } from 'node:crypto';
import {checkSharedQuota} from './quota.mjs';

const hash = token => createHash('sha256').update(token).digest('hex');
const isToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const oneDay = 24*60*60*1000;

export function createMemoryStore() {
  const sessions = new Map();
  const leads = [];
  const leadBySession = new Map();
  return {
    mode: 'memory',
    async consumeQuota(){ return true; },
    async createSession() {
      const token = randomBytes(32).toString('hex');
      sessions.set(hash(token), {messages: [], expires: Date.now()+oneDay});
      return token;
    },
    async getMessages(token) {
      if (!isToken(token)) return null;
      const session = sessions.get(hash(token));
      if (!session || session.expires < Date.now()) return null;
      return session.messages.slice(-12);
    },
    async appendExchange(token, userMessage, reply) {
      if (!isToken(token)) return false;
      const session = sessions.get(hash(token));
      if (!session || session.expires < Date.now()) return false;
      session.messages.push({role:'user',content:userMessage}, {role:'assistant',content:reply});
      session.messages = session.messages.slice(-12);
      session.expires = Date.now()+oneDay;
      return true;
    },
    async createLead(token, lead) {
      if (!isToken(token)) return null;
      const session = sessions.get(hash(token));
      if (!session || session.expires < Date.now()) return null;
      if (leadBySession.has(hash(token))) return null;
      const id = randomBytes(16).toString('hex');
      leadBySession.set(hash(token), id);
      leads.push({id, ...lead});
      return id;
    },
    async close() {}
  };
}

export async function createDatabaseStore(databaseUrl) {
  if (!databaseUrl) return createMemoryStore();
  const {default: pg} = await import('pg');
  const pool = new pg.Pool({connectionString: databaseUrl, max:5, connectionTimeoutMillis:5000, idleTimeoutMillis:30000, ssl: process.env.DB_SSL === 'false' ? false : {rejectUnauthorized:true}});
  await pool.query('SELECT 1');
  return {
    mode:'postgres',
    async consumeQuota(address){return checkSharedQuota(pool,address,process.env.QUOTA_HASH_SECRET);},
    async createSession() {
      const token = randomBytes(32).toString('hex');
      await pool.query('INSERT INTO concierge.ai_sessions(token_hash,expires_at) VALUES ($1,now()+interval \'1 day\')', [hash(token)]);
      return token;
    },
    async getMessages(token) {
      if (!isToken(token)) return null;
      const result = await pool.query(`SELECT m.role,m.content FROM concierge.ai_sessions s
        LEFT JOIN LATERAL (SELECT role,content,created_at,id FROM concierge.ai_messages WHERE session_id=s.id ORDER BY created_at DESC,id DESC LIMIT 12) m ON true
        WHERE s.token_hash=$1 AND s.status='active' AND s.expires_at > now() ORDER BY m.created_at ASC,m.id ASC`,[hash(token)]);
      if (!result.rowCount) return null;
      return result.rows.filter(r=>r.role).map(r=>({role:r.role,content:r.content}));
    },
    async appendExchange(token, message, reply) {
      if (!isToken(token)) return false;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query(`SELECT id FROM concierge.ai_sessions WHERE token_hash=$1 AND status='active' AND expires_at>now() FOR UPDATE`,[hash(token)]);
        if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
        const id=result.rows[0].id;
        await client.query(`INSERT INTO concierge.ai_messages(session_id,role,content) VALUES ($1,'user',$2),($1,'assistant',$3)`,[id,message,reply]);
        await client.query(`UPDATE concierge.ai_sessions SET updated_at=now(),expires_at=now()+interval '1 day' WHERE id=$1`,[id]);
        await client.query('COMMIT');
        return true;
      } catch (e) {await client.query('ROLLBACK'); throw e;} finally {client.release();}
    },
    async createLead(token, lead) {
      if (!isToken(token)) return null;
      const result = await pool.query(`INSERT INTO concierge.ai_leads (session_id,company_name,contact_name,email,inquiry_summary,consent_at)
        SELECT id,$2,$3,$4,$5,now() FROM concierge.ai_sessions
        WHERE token_hash=$1 AND status='active' AND expires_at>now()
        ON CONFLICT (session_id) DO NOTHING RETURNING id`,
        [hash(token), lead.company_name, lead.contact_name, lead.email, lead.inquiry_summary]);
      return result.rows[0]?.id || null;
    },
    async close(){await pool.end();}
  };
}

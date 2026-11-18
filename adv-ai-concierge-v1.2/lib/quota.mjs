import {createHash} from 'node:crypto';

// Application-side conservative quota: counters are shared across Cloud Run instances.
// Never accept a client-selected key. A global cap protects against spoofed IPs.
export function makeQuotaKey(kind, value, salt) {
  if (!['global','client'].includes(kind) || !salt) throw new Error('Invalid quota configuration');
  return createHash('sha256').update(`${salt}:${kind}:${value}`).digest('hex');
}

export async function checkSharedQuota(pool, clientAddress, salt, now = new Date()) {
  const minute = new Date(Math.floor(now.getTime() / 60000) * 60000);
  const day = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const entries = [
    [makeQuotaKey('client', clientAddress || 'unknown', salt), minute, 8],
    [makeQuotaKey('global', 'minute', salt), minute, 120],
    [makeQuotaKey('global', 'day', salt), day, Number(process.env.DAILY_API_REQUEST_LIMIT || 500)]
  ];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, bucket, max] of entries) {
      if (!Number.isSafeInteger(max) || max < 1 || max > 100000) throw new Error('Invalid quota limit');
      const result = await client.query(`INSERT INTO concierge.ai_quota (quota_key,bucket_start,request_count)
        VALUES ($1,$2,1)
        ON CONFLICT (quota_key,bucket_start)
        DO UPDATE SET request_count=concierge.ai_quota.request_count + 1
        WHERE concierge.ai_quota.request_count < $3
        RETURNING request_count`,[key,bucket,max]);
      if (!result.rowCount) {await client.query('ROLLBACK');return false;}
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {await client.query('ROLLBACK');throw err;}
  finally {client.release();}
}

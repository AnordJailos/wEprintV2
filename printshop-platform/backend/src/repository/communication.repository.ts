/** The message log attached to an order (WhatsApp deep links, e-mails sent). */
import { one, query } from '@/db/pool';
import type { CommunicationRow } from '@/entities/types';

export const CommunicationRepository = {
  listByOrder(orderId: number) {
    return query<CommunicationRow>(
      'SELECT * FROM communications WHERE order_id = $1 ORDER BY sent_at DESC, id DESC',
      [orderId],
    );
  },

  async insert(data: {
    order_id: number;
    channel: 'whatsapp' | 'email';
    summary: string;
    payload: string | null;
    sent_by: number | null;
  }) {
    const row = await one<CommunicationRow>(
      `INSERT INTO communications (order_id, channel, summary, payload, sent_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.order_id, data.channel, data.summary, data.payload, data.sent_by],
    );
    return row!;
  },
};

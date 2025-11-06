import { z } from 'zod';
import { QueueState } from '../../common/enums/queue-state.enum';

export const UpdateQueueStateSchema = z.object({
  queueId: z.string().uuid(),
  state: z.nativeEnum(QueueState),
});

export type UpdateQueueStateDto = z.infer<typeof UpdateQueueStateSchema>;

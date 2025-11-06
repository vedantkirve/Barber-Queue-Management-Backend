import { z } from 'zod';
import { QueueState } from 'src/common/enums/queue-state.enum';
import { CreateVisitSchema } from './create-visit.dto';

// Combines: queue state update + all visit fields
export const UpdateStateAndCreateVisitSchema = z
  .object({
    queueId: z.string().uuid('Queue ID must be a valid UUID'),
    state: z.nativeEnum(QueueState),
  })
  .merge(CreateVisitSchema);

export type UpdateStateAndCreateVisitDto = z.infer<
  typeof UpdateStateAndCreateVisitSchema
>;

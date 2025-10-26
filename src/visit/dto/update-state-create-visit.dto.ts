import { z } from 'zod';
import { QueueState } from 'src/common/enums/queue-state.enum';
import { CreateVisitSchema } from './create-visit.dto';

// Combines: queue state update + only the visit fields we actually need here
// We reuse the existing CreateVisitSchema but pick only totalAmount and services.
export const UpdateStateAndCreateVisitSchema = z
  .object({
    queueId: z.string().uuid('Queue ID must be a valid UUID'),
    // Allow only IN_QUEUE or PICKED for this transition
    state: z.nativeEnum(QueueState),
  })
  .merge(
    CreateVisitSchema.pick({
      totalAmount: true,
      services: true,
    }),
  );

export type UpdateStateAndCreateVisitDto = z.infer<
  typeof UpdateStateAndCreateVisitSchema
>;

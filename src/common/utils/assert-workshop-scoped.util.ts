import { NotFoundException } from '@nestjs/common';
import { RequestUser } from '@common/types/request-user.type';

/**
 * Multi-tenancy pasiva (regla 12): un actor nunca debe poder ver ni operar
 * sobre una entidad de otro taller. Se responde 404 (no 403) para no filtrar
 * la existencia del recurso en otro workshopId.
 */
export function assertWorkshopScoped<T extends { workshopId: string }>(
  entity: T | null,
  actor: Pick<RequestUser, 'workshopId'>,
  message?: string,
): T {
  if (!entity || entity.workshopId !== actor.workshopId) {
    throw new NotFoundException(message);
  }
  return entity;
}

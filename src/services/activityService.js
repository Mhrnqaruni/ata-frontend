// Renames an assessment or quiz (PATCH /api/activities/{kind}/{id}/name), then refreshes all cached data.
// Area: academics

import api from './api';
import { invalidateAfter, cacheFamilies } from './queryCache';
const commands = invalidateAfter(
  {
    rename: async (kind, id, name) =>
      (await api.patch(`/api/activities/${kind}/${encodeURIComponent(id)}/name`, { name })).data,
  },
  ['rename'],
  cacheFamilies.all
);
export const renameActivity = commands.rename;

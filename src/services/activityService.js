import api from './api';
export const renameActivity = async (kind, id, name) =>
  (await api.patch(`/api/activities/${kind}/${encodeURIComponent(id)}/name`, { name })).data;

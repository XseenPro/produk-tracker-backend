export const roleHierarchy = ['pabrik', 'distributor', 'agen', 'reseller'];

export const isRoleHigher = (currentRole: string, targetRole: string): boolean => {
  return roleHierarchy.indexOf(currentRole) < roleHierarchy.indexOf(targetRole);
};
import { useAuthStore } from "@/stores/auth-store";

/**
 * Hook for checking user permissions.
 * Uses the current user's role permissions from the auth store.
 *
 * @example
 * const { can, canAny, canAll } = usePermissions();
 * if (can("products.create")) { ... }
 * if (canAny(["orders.view", "orders.create"])) { ... }
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.role?.permissions || [];

  /**
   * Check if user has a specific permission
   */
  const can = (permission: string): boolean => {
    // Admin has all permissions
    if (user?.role?.name === "admin") return true;
    return permissions.includes(permission);
  };

  /**
   * Check if user has any of the given permissions
   */
  const canAny = (perms: string[]): boolean => {
    if (user?.role?.name === "admin") return true;
    return perms.some((p) => permissions.includes(p));
  };

  /**
   * Check if user has all of the given permissions
   */
  const canAll = (perms: string[]): boolean => {
    if (user?.role?.name === "admin") return true;
    return perms.every((p) => permissions.includes(p));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (roleName: string): boolean => {
    return user?.role?.name === roleName;
  };

  /**
   * Check if user is admin
   */
  const isAdmin = user?.role?.name === "admin";

  return {
    can,
    canAny,
    canAll,
    hasRole,
    isAdmin,
    permissions,
  };
}

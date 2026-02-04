// Re-export from colocated location for backward compatibility with shared components
// The actual hook implementation is colocated with the recipes/[id] route
export {
  useCookingState,
  type StepStatus,
  type Timer,
  type CookingState,
  type CookingActions,
} from '@/app/recipes/[id]/_hooks/use-cooking-state';

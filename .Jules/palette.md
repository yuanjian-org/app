## 2025-06-21 - Add loading state to Pearl Student modal
**Learning:** Adding loading states to async operations like TRPC mutations in Modals is crucial for providing immediate visual feedback to the user and preventing concurrent conflicting mutations.
**Action:** When working on modals with async actions (like submit/decline), always implement a loading state using `useState`, managed via a `try...finally` block, and hook it up to the `isLoading` and `isDisabled` props on the respective ChakraUI buttons. This guarantees the UI properly locks during operations.

import * as trpcNext from '@trpc/server/adapters/next';
import { createContext } from '../../../api/context';
import { apiRouter } from "../../../api/apiRouter";

// export API handler
// @see https://trpc.io/docs/api-handler
export default trpcNext.createNextApiHandler({
  router: apiRouter,
  createContext,
  onError({ error, type, path, input, ctx, req }) {
    console.error('Error:', error);
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      // TODO: send to bug reporting
    }
  },
});

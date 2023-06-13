import { AnyRouter } from "@trpc/server";
import { TRPCClientError, TRPCLink } from "@trpc/client";
import { observable, tap } from "@trpc/server/observable";
import { toast } from "react-toastify";
import { AuthenticationClient } from 'authing-js-sdk'
import browserEnv from "./browserEnv";
import Router from "next/router";
const authenticationClient = new AuthenticationClient({
  appId: browserEnv.NEXT_PUBLIC_AUTHING_APP_ID,
  appHost: browserEnv.NEXT_PUBLIC_AUTHING_APP_HOST,
});

const onError = (result: TRPCClientError<any>) => {
  // TODO Browser shows result.data === undefined when environemnt variables are missing.
  // We should fix it or at least make it easier to understand.
  if (result.data.code === 'UNAUTHORIZED') {
    toast.error('Authentication expired, Please login again.', { autoClose: false });
    authenticationClient.logout().then(() => {
      Router.reload();
    });
  } else {
    // do nothing
  }
};

export function requestFinishLink<TRouter extends AnyRouter = AnyRouter>(): TRPCLink<TRouter> {
  return () => {
    return ({ op, next }) => {
      return observable((observer) => {
        return next(op)
          .pipe(
            tap({
              next(result) {
                // onResult(result);
              },
              error(result) {
                onError(result);
              },
            }),
          )
          .subscribe(observer);
      });
    };
  };
}

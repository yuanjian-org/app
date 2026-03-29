1. **Create `/auth/set-profile.tsx` page**
   - Create a page that renders `<PageLoader />`.
   - Use `useSession` and `useMe` hooks.
   - Use `useEffect` to redirect to `/auth/login` if unauthenticated.
   - If authenticated and `me.phone` is truthy, read `callbackUrl` from the router and redirect back to it.
   - Rely on `AppPageContainer`'s `PostLoginModels` to automatically render the `SetPhoneModal` when `me.phone` is `null`.

2. **Update `src/pages/api/oauth2/authorize.ts`**
   - After verifying `!session?.me`, add a check for `!session.me.phone`.
   - If `!session.me.phone` is true, redirect the user to `/auth/set-profile` with the `callbackUrl` pointing to the current URL.

3. **Update `src/pages/api/oauth2/authorize.test.ts`**
   - Update existing `mockSession` assignments to include a truthy `phone` value (e.g., `phone: "1234567890"`).
   - Add a new test case that simulates a user logged in without a phone number (`phone: null`) and asserts that it correctly returns a `302` redirect to `/auth/set-profile` with the `callbackUrl` parameter.

4. **Complete pre commit steps**
   - Complete pre commit steps to ensure proper testing, verifications, reviews and reflections are done.

5. **Submit the change**
   - Once all tests pass, submit the change with a descriptive commit message.

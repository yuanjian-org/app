import { Box } from '@chakra-ui/react';
import { fullPage } from 'AppPage';
import { breakpoint } from 'theme/metrics';
import { sidebarContentMarginTop } from 'components/Sidebar';
import { parseQueryString } from 'shared/strings';
import { useRouter } from 'next/router';
import Loader from 'components/Loader';

export default fullPage(() => {
  const id = parseQueryString(useRouter(), 'id');
  const x = parseQueryString(useRouter(), 'x');

  return <JinshujuForm formId={id} urlSafeXField={x} />;
}, "填写表单");

/**
 * @param urlSafeXField the x_field_1 value passed to the form.
 * Consider using `toBase64UrlSafe`. https://help.jinshuju.net/articles/case30
 */
export function getEmbeddedFormUrl(formId: string, urlSafeXField: string) {
  return `/form?id=${formId}&x=${urlSafeXField}`;
}

/**
 * See getEmbeddedFormUrl
 */
export function getStandaloneFormUrl(formId: string, urlSafeXField: string) {
  return `https://jsj.top/f/${formId}?x_field_1=${urlSafeXField}`;
}

/**
 * The containing page must be a `fullPage`, and the form should be the only
 * component on the page.
 * 
 * @returns <Loader /> if any of the parameters are undefined,
 */
export function JinshujuForm({ formId, urlSafeXField }: {
  formId: string | undefined,
  urlSafeXField: string | undefined,
}) {
  const url = formId && urlSafeXField ?
    getStandaloneFormUrl(formId, urlSafeXField) +
    `&background=transparent&banner=hide&embedded=true&inner_redirect=false`
    :
    null;

  return !url ? <Loader /> : (
    <Box
      width="100%"
      height="100vh"
      marginTop={{
        base: sidebarContentMarginTop,
        [breakpoint]: -sidebarContentMarginTop
      }}
    >
      <iframe
        id="jinshuju"
        src={url}
        width="100%"
        height="100%"
        allowTransparency={true}
      />
    </Box>
  );
}

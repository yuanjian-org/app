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
  const url = `https://jsj.top/f/${id}?x_field_1=${x}` +
    `&background=transparent&banner=hide&embedded=true&inner_redirect=false`;

  return (!id || !x) ? <Loader /> : (
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
}, "填写表单");

/**
 * @param encodedXField the x_field_1 value passed to the form. Must be URL safe.
 * Consider using `toBase64UrlSafe`. https://help.jinshuju.net/articles/case30
 */
export function getFormUrl(formId: string, encodedXField: string) {
  return `/form?id=${formId}&x=${encodedXField}`;
}

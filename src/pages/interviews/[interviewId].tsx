import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from "shared/strings";
import { widePage } from 'AppPage';
import Interview from 'components/Interview';

export default widePage(() => {
  const interviewId = parseQueryStringOrUnknown(useRouter(), 'interviewId');

  return <Interview interviewId={interviewId} hasTitle />;
});

import { fullPage } from "AppPage";
import { JinshujuForm } from "pages/form";
import { encodeXField } from "shared/jinshuju";
import useMe from "useMe";

export default fullPage(() => {
  const me = useMe();
  const x = encodeXField(me, me.id);
  return <JinshujuForm formId="nsnx4G" urlSafeXField={x} />;
}, "《学生通信原则》评测");

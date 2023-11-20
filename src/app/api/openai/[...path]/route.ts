import { OpenaiPath, prettyObject, getServerSideConfig, OpenAIListModelResponse } from '../../../../edge-common-chat';
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestOpenai } from "../../common";
import setCorsHeaders from "../../../../edge-common-chat/setCorsHeaders";

const ALLOWD_PATH = new Set(Object.values(OpenaiPath));

function getModels(remoteModelRes: OpenAIListModelResponse) {
  const config = getServerSideConfig();

  if (config.disableGPT4) {
    remoteModelRes.data = remoteModelRes.data.filter(
      (m) => !m.id.startsWith("gpt-4"),
    );
  }

  return remoteModelRes;
}

const getApiKey = () => {
  // TODO need to use runtime env here, using apiEnv will cause edge runtime to use fs module which will throw error
  return process.env.OPENAI_API_KEY;
};

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenAI Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const subpath = params.path.join("/");

  if (!ALLOWD_PATH.has(subpath)) {
    console.log("[OpenAI Route] forbidden path ", subpath);
    return NextResponse.json(
      {
        error: true,
        msg: "you are not allowed to request " + subpath,
      },
      {
        status: 403,
      },
    );
  }

  const authResult = await auth(req);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  try {
    // const userId = authResult.decodedToken.sub;
    const apiKey = getApiKey();
    req.headers.set("Authorization", `Bearer ${apiKey}`);
    const response = await requestOpenai(req);
    // console.log(
    //   'in route',
    //   req.headers.get('client-time'),
    //   response.headers.get('access-control-allow-origin')
    // );
    /*

    It seems like next middleware does not guarantee response header modification
    See the logs below.

            AUG 17 02:56:51.29
            -
            union.anyscript.dev
            [POST] /api/openai/v1/chat/completions
            in route 1692266210425 *
            AUG 17 02:56:50.88

            union.anyscript.dev
            [POST] /api/openai/v1/chat/completions
            [POST] /api/openai/v1/chat/completions?nxtPpath=v1%2Fchat%2Fcompletions status=200
            AUG 17 02:56:50.86
            -
            union.anyscript.dev
            [POST] /en/api/openai/v1/chat/completions
            { t: '1692266210425', pathname: '/api/openai/v1/chat/completions', after: 'http://localhost:31111' }
            AUG 17 02:56:50.86
            -
            union.anyscript.dev
            [POST] /en/api/openai/v1/chat/completions
            { t: '1692266210425', pathname: '/api/openai/v1/chat/completions', before: null }
     */
    setCorsHeaders(req, response);

    // list models
    if (subpath === OpenaiPath.ListModelPath && response.status === 200) {
      const resJson = (await response.json()) as OpenAIListModelResponse;
      const availableModels = getModels(resJson);
      return NextResponse.json(availableModels, {
        status: response.status,
      });
    }

    return response;
  } catch (e) {
    console.error("[OpenAI] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = 'edge';

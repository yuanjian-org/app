import {NextRequest} from "next/server";

const setCorsHeaders = (request: NextRequest, response: Response) => {
  response.headers.set('Access-Control-Allow-Credentials', "true");
  response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') ?? '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Cookie, Set-Cookie, X-CSRF-Token, X-Requested-With, Accept, Authorization, Client-Time, Union-Version, No-Chrome-Bug, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default setCorsHeaders;

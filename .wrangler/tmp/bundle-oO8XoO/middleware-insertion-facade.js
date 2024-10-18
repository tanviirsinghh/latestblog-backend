				import worker, * as OTHER_EXPORTS from "D:\\Git-Blog\\backend\\src\\index.ts";
				import * as __MIDDLEWARE_0__ from "D:\\Git-Blog\\backend\\node_modules\\wrangler\\templates\\middleware\\middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "D:\\Git-Blog\\backend\\node_modules\\wrangler\\templates\\middleware\\middleware-miniflare3-json-error.ts";
				
				worker.middleware = [
					__MIDDLEWARE_0__.default,__MIDDLEWARE_1__.default,
					...(worker.middleware ?? []),
				].filter(Boolean);
				
				export * from "D:\\Git-Blog\\backend\\src\\index.ts";
				export default worker;
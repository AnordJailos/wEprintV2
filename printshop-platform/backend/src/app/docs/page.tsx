/**
 * Swagger UI, served from the API itself.
 *
 * The spec is fetched from /api-docs/openapi.json, so the page can never drift
 * from the document in src/api/docs/openapi.ts.
 */




'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    SwaggerUIBundle?: (config: {
      url: string;
      dom_id: string;
      deepLinking: boolean;
      persistAuthorization: boolean;
    }) => void;
  }
}

export default function DocsPage() {
  useEffect(() => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src =
      'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js';
    script.onload = () => {
      window.SwaggerUIBundle?.({
        url: '/api-docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
      });
    };

    document.body.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  return <div id="swagger-ui" />;
}



// export const dynamic = 'force-static';

// export default function DocsPage() {
//   return (
//     <>
//       {/* eslint-disable-next-line @next/next/no-css-tags */}
//       <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
//       <div id="swagger-ui" />
//       <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" defer />
//       <script
//         // eslint-disable-next-line react/no-danger
//         dangerouslySetInnerHTML={{
//           __html: `
//             window.addEventListener('load', function () {
//               window.SwaggerUIBundle({
//                 url: '/api-docs/openapi.json',
//                 dom_id: '#swagger-ui',
//                 deepLinking: true,
//                 persistAuthorization: true,
//               });
//             });
//           `,
//         }}
//       />
//     </>
//   );
// }

/**
 * Swagger UI, served from the API itself.
 *
 * The spec is fetched from /api-docs/openapi.json, so the page can never drift
 * from the document in src/api/docs/openapi.ts.
 */
export const dynamic = 'force-static';

export default function DocsPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
      <div id="swagger-ui" />
      <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" defer />
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function () {
              window.SwaggerUIBundle({
                url: '/api-docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                persistAuthorization: true,
              });
            });
          `,
        }}
      />
    </>
  );
}

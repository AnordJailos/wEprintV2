/**
 * The OpenAPI 3.1 document, hand-maintained.
 *
 * It is the published contract. When you add or change an endpoint, edit this
 * file in the same commit — a route that is not described here is a route your
 * future self will not know exists.
 *
 * Served at  GET /api-docs/openapi.json
 * Rendered at    /docs
 */
export function openApiDocument(baseUrl: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: "AK IT'S TIME TO SHINE — Print Studio API",
      version: '1.0.0',
      description:
        'Backend for the AK print studio. Path-based versioning under /api/v1. ' +
        'Bearer JWT authentication. JSON everywhere except the design upload, which is multipart. ' +
        'There is exactly one administrator account; the register endpoint always creates a customer.',
    },
    servers: [{ url: baseUrl, description: 'This deployment' }],
    tags: [
      { name: 'auth', description: 'Registration, sign-in, password reset' },
      { name: 'users', description: 'The signed-in customer’s own profile' },
      { name: 'products', description: 'Catalogue. Reads are public; writes are owner-only' },
      { name: 'designs', description: 'Customer artwork uploads' },
      { name: 'inspiration', description: 'Curated inspiration board' },
      { name: 'orders', description: 'Order lifecycle and timeline' },
      { name: 'communications', description: 'WhatsApp links and email log per order' },
      { name: 'ai', description: 'Assistant chat and the knowledge base behind it' },
      { name: 'admin', description: 'Owner dashboard' },
      { name: 'ops', description: 'Health' },
    ],
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'unauthorized' },
                message: { type: 'string', example: 'Sign in to continue.' },
                details: {},
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['customer', 'admin'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        ProductOption: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            option_type: { type: 'string', example: 'size' },
            option_value: { type: 'string', example: 'XL' },
            swatch: { type: 'string', nullable: true },
            price_delta: { type: 'number' },
            sort_order: { type: 'integer' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            slug: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            base_price: { type: 'number' },
            lead_time: { type: 'string' },
            image_url: { type: 'string', nullable: true },
            is_available: { type: 'boolean' },
            options: { type: 'array', items: { $ref: '#/components/schemas/ProductOption' } },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            product_id: { type: 'integer' },
            product_name: { type: 'string' },
            quantity: { type: 'integer' },
            unit_price: { type: 'number' },
            options: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            reference: { type: 'string', example: 'AK-2026-0042' },
            user_id: { type: 'integer' },
            design_id: { type: 'integer', nullable: true },
            status: {
              type: 'string',
              enum: [
                'pending',
                'confirmed',
                'in_production',
                'quality_check',
                'ready',
                'delivered',
                'cancelled',
              ],
            },
            payment_status: { type: 'string', enum: ['unpaid', 'deposit', 'paid', 'refunded'] },
            total: { type: 'number' },
            notes: { type: 'string', nullable: true },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        TimelineEntry: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            status: { type: 'string' },
            note: { type: 'string', nullable: true },
            changed_at: { type: 'string', format: 'date-time' },
          },
        },
        Design: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_id: { type: 'integer', nullable: true },
            file_name: { type: 'string' },
            file_url: { type: 'string' },
            mime_type: { type: 'string' },
            size_bytes: { type: 'integer' },
            notes: { type: 'string', nullable: true },
            uploaded_at: { type: 'string', format: 'date-time' },
          },
        },
        InspirationItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            source: { type: 'string' },
            external_url: { type: 'string' },
            image_url: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        Communication: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_id: { type: 'integer' },
            channel: { type: 'string', enum: ['whatsapp', 'email'] },
            summary: { type: 'string' },
            sent_at: { type: 'string', format: 'date-time' },
          },
        },
        KnowledgeEntry: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string', nullable: true },
            is_published: { type: 'boolean' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ChatResponse: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            sources: { type: 'array', items: { type: 'string' } },
          },
        },
        Dashboard: {
          type: 'object',
          properties: {
            orders_today: { type: 'integer' },
            revenue_this_month: { type: 'number' },
            open_orders: { type: 'integer' },
            average_turnaround_days: { type: 'number' },
            orders_by_status: { type: 'array', items: { type: 'object' } },
            revenue_trend: { type: 'array', items: { type: 'object' } },
            assistant_online: { type: 'boolean' },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Validation failed',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Missing or invalid token',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Owner-only endpoint',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'No such resource',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
      parameters: {
        Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        PerPage: {
          name: 'per_page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
        },
        IdPath: { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['ops'],
          summary: 'Liveness, plus database and assistant reachability',
          security: [],
          responses: { 200: { description: 'Healthy' }, 503: { description: 'Degraded' } },
        },
      },

      '/api/v1/auth/register': {
        post: {
          tags: ['auth'],
          summary: 'Create a customer account (role is always customer)',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    phone: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
            },
            409: { description: 'Email already registered' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Sign in',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Signed in',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['auth'],
          summary: 'Sign out (the client discards the token)',
          responses: { 200: { description: 'Signed out' } },
        },
      },
      '/api/v1/auth/forgot-password': {
        post: {
          tags: ['auth'],
          summary: 'Request a reset token — always answers the same way',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Acknowledged' } },
        },
      },
      '/api/v1/auth/reset-password': {
        post: {
          tags: ['auth'],
          summary: 'Set a new password using a reset token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8 } },
                },
              },
            },
          },
          responses: { 200: { description: 'Password changed' }, 400: { $ref: '#/components/responses/BadRequest' } },
        },
      },

      '/api/v1/users/me': {
        get: {
          tags: ['users'],
          summary: 'The signed-in user',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        patch: {
          tags: ['users'],
          summary: 'Update name or phone',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' } } },
              },
            },
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      '/api/v1/products': {
        get: {
          tags: ['products'],
          summary: 'List the catalogue (public)',
          security: [],
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/PerPage' },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                      page: { type: 'integer' },
                      per_page: { type: 'integer' },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['products'],
          summary: 'Create a product (owner only)',
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/v1/products/{id}': {
        get: {
          tags: ['products'],
          summary: 'One product by id or slug (public)',
          security: [],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          tags: ['products'],
          summary: 'Update a product (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
        delete: {
          tags: ['products'],
          summary: 'Archive a product (owner only) — soft delete',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 204: { description: 'Archived' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/products/{id}/options': {
        post: {
          tags: ['products'],
          summary: 'Add an option (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/products/{id}/options/{optionId}': {
        delete: {
          tags: ['products'],
          summary: 'Remove an option (owner only)',
          parameters: [
            { $ref: '#/components/parameters/IdPath' },
            { name: 'optionId', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: { 204: { description: 'Removed' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },

      '/api/v1/designs': {
        get: {
          tags: ['designs'],
          summary: 'List your uploaded artwork',
          parameters: [{ name: 'order_id', in: 'query', schema: { type: 'integer' } }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Design' } } },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['designs'],
          summary: 'Upload artwork (multipart/form-data)',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    order_id: { type: 'integer' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Design' } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            413: { description: 'File too large' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/api/v1/designs/{id}': {
        get: {
          tags: ['designs'],
          summary: 'One design (yours, or any if you are the owner)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 200: { description: 'OK' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
        delete: {
          tags: ['designs'],
          summary: 'Delete a design and its file',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 204: { description: 'Deleted' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/api/v1/uploads/{file}': {
        get: {
          tags: ['designs'],
          summary: 'Fetch an uploaded file. Always served as an attachment.',
          security: [],
          parameters: [{ name: 'file', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'The file' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      '/api/v1/inspiration': {
        get: {
          tags: ['inspiration'],
          summary: 'The inspiration board (public)',
          security: [],
          parameters: [{ name: 'tag', in: 'query', schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/InspirationItem' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['inspiration'],
          summary: 'Pin an item (owner only)',
          responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/inspiration/{id}': {
        delete: {
          tags: ['inspiration'],
          summary: 'Remove an item (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 204: { description: 'Removed' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },

      '/api/v1/orders': {
        get: {
          tags: ['orders'],
          summary: 'Your orders — or every order, if you are the owner',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/PerPage' },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                      page: { type: 'integer' },
                      per_page: { type: 'integer' },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['orders'],
          summary: 'Place an order. Prices come from the database, never the client.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    design_id: { type: 'integer' },
                    notes: { type: 'string' },
                    items: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        required: ['product_id', 'quantity'],
                        properties: {
                          product_id: { type: 'integer' },
                          quantity: { type: 'integer', minimum: 1 },
                          options: { type: 'object', additionalProperties: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/orders/{id}': {
        get: {
          tags: ['orders'],
          summary: 'One order',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/orders/{id}/status': {
        patch: {
          tags: ['orders'],
          summary: 'Move an order along (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string' }, note: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/orders/{id}/payment': {
        patch: {
          tags: ['orders'],
          summary: 'Record payment state (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['payment_status'],
                  properties: {
                    payment_status: { type: 'string', enum: ['unpaid', 'deposit', 'paid', 'refunded'] },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/orders/{id}/timeline': {
        get: {
          tags: ['orders'],
          summary: 'Every status change, oldest first',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/TimelineEntry' } } },
                  },
                },
              },
            },
          },
        },
      },

      '/api/v1/communications/{orderId}': {
        get: {
          tags: ['communications'],
          summary: 'Message log for an order',
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Communication' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['communications'],
          summary: 'Email the customer about this order (owner only)',
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: { subject: { type: 'string' }, message: { type: 'string' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Logged' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/communications/{orderId}/whatsapp-link': {
        get: {
          tags: ['communications'],
          summary: 'A wa.me deep link prefilled with the order reference',
          parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      '/api/v1/ai/chat': {
        post: {
          tags: ['ai'],
          summary: 'Ask the studio assistant. Answers are grounded in the knowledge base.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['question'],
                  properties: { question: { type: 'string' }, conversation_id: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatResponse' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            429: { description: 'Rate limited' },
            502: { description: 'The assistant is unavailable' },
          },
        },
      },
      '/api/v1/ai/knowledge': {
        get: {
          tags: ['ai'],
          summary: 'List knowledge entries (owner only)',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/KnowledgeEntry' } } },
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['ai'],
          summary: 'Add a knowledge entry (owner only). Indexed immediately.',
          responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/ai/knowledge/{id}': {
        patch: {
          tags: ['ai'],
          summary: 'Edit a knowledge entry (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
        delete: {
          tags: ['ai'],
          summary: 'Delete a knowledge entry and its vectors (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 204: { description: 'Deleted' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },
      '/api/v1/ai/knowledge/{id}/reindex': {
        post: {
          tags: ['ai'],
          summary: 'Recompute this entry’s vectors (owner only)',
          parameters: [{ $ref: '#/components/parameters/IdPath' }],
          responses: { 200: { description: 'Reindexed' }, 403: { $ref: '#/components/responses/Forbidden' } },
        },
      },

      '/api/v1/admin/dashboard': {
        get: {
          tags: ['admin'],
          summary: 'Studio dashboard aggregates (owner only)',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dashboard' } } } },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
    },
    security: [{ bearer: [] }],
  } as const;
}

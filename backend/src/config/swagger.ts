import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GEO SaaS API',
      version: '1.0.0',
      description: 'API documentation for GEO SaaS - AI Search Visibility Tracking',
      contact: {
        name: 'GEO SaaS Team',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token for state-changing requests',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'email', 'name', 'plan', 'createdAt'],
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            domain: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'userId', 'name', 'domain', 'createdAt', 'updatedAt'],
        },
        Run: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            promptId: { type: 'string', format: 'uuid' },
            engineId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'projectId', 'promptId', 'engineId', 'status', 'createdAt'],
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
          },
          required: ['error', 'message', 'statusCode'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

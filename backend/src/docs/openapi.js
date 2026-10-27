// Hand-written OpenAPI spec, shown at /api-docs
const idParam = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const json = (props, required = []) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', required, properties: props } } },
});
const s = { type: 'string' };
const ok = (description) => ({ description });
const secured = [{ bearerAuth: [] }];
const common = { 400: ok('Validation error / bad ID'), 401: ok('Not logged in'), 403: ok('No access to this family'), 404: ok('Not found') };

module.exports = {
  openapi: '3.0.3',
  info: { title: 'ParamPara API', version: '1.0.0', description: 'Family heritage and memory platform. Log in, then click Authorize and paste the token.' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], summary: 'Create an account', requestBody: json({ name: s, email: s, password: { type: 'string', minLength: 8 } }, ['name', 'email', 'password']), responses: { 201: ok('Account created, returns token'), 400: ok('Validation error'), 409: ok('Email already registered') } } },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'Log in', requestBody: json({ email: s, password: s }, ['email', 'password']), responses: { 200: ok('Returns token'), 401: ok('Invalid email or password') } } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok('User'), 401: ok('Not logged in') } } },

    '/api/families': {
      post: { tags: ['Families'], summary: 'Create a family (you become owner)', security: secured, requestBody: json({ name: s, description: s }, ['name']), responses: { 201: ok('Created'), 400: ok('Validation error'), 401: ok('Not logged in') } },
      get: { tags: ['Families'], summary: 'Families you own or collaborate on', security: secured, responses: { 200: ok('List'), 401: ok('Not logged in') } },
    },
    '/api/families/{id}': {
      get: { tags: ['Families'], summary: 'Get a family', security: secured, parameters: [idParam()], responses: { 200: ok('Family'), ...common } },
      patch: { tags: ['Families'], summary: 'Update name/description (owner only)', security: secured, parameters: [idParam()], requestBody: json({ name: s, description: s }), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Families'], summary: 'Delete family and everything in it (owner only)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },
    '/api/families/{id}/collaborators': { post: { tags: ['Families'], summary: 'Add a collaborator by email (owner only)', security: secured, parameters: [idParam()], requestBody: json({ email: s }, ['email']), responses: { 201: ok('Added'), 409: ok('Already a collaborator'), ...common } } },
    '/api/families/{id}/collaborators/{userId}': { delete: { tags: ['Families'], summary: 'Remove a collaborator (owner only)', security: secured, parameters: [idParam(), idParam('userId')], responses: { 200: ok('Removed'), ...common } } },

    '/api/families/{id}/members': {
      post: { tags: ['Members'], summary: 'Add a family member', security: secured, parameters: [idParam()], requestBody: json({ name: s, birthDate: { type: 'string', format: 'date' }, bio: s }, ['name']), responses: { 201: ok('Created'), ...common } },
      get: { tags: ['Members'], summary: 'List members of a family', security: secured, parameters: [idParam()], responses: { 200: ok('List'), ...common } },
    },
    '/api/members/{id}': {
      get: { tags: ['Members'], summary: 'Get a member', security: secured, parameters: [idParam()], responses: { 200: ok('Member'), ...common } },
      patch: { tags: ['Members'], summary: 'Update a member', security: secured, parameters: [idParam()], requestBody: json({ name: s, birthDate: s, bio: s }), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Members'], summary: 'Delete a member (also removes their relationships and memory tags)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },

    '/api/relationships': { post: { tags: ['Relationships'], summary: 'Create a relationship: source is the <type> of target', security: secured, requestBody: json({ source: s, target: s, type: { type: 'string', enum: ['parent', 'child', 'spouse', 'sibling'] } }, ['source', 'target', 'type']), responses: { 201: ok('Created'), 409: ok('Duplicate'), ...common } } },
    '/api/members/{id}/relationships': { get: { tags: ['Relationships'], summary: 'Relationships of a member', security: secured, parameters: [idParam()], responses: { 200: ok('List'), ...common } } },
    '/api/relationships/{id}': {
      patch: { tags: ['Relationships'], summary: 'Change the type', security: secured, parameters: [idParam()], requestBody: json({ type: { type: 'string', enum: ['parent', 'child', 'spouse', 'sibling'] } }, ['type']), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Relationships'], summary: 'Delete a relationship', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },

    '/api/memories': {
      post: { tags: ['Memories'], summary: 'Create a memory', security: secured, requestBody: json({ family: s, title: s, content: s, category: { type: 'string', enum: ['Story', 'Recipe', 'Photograph', 'Letter', 'Family event', 'Tradition', 'Achievement', 'Other'] }, eventDate: { type: 'string', format: 'date' }, location: s, mediaUrl: s, people: { type: 'array', items: s } }, ['family', 'title', 'content']), responses: { 201: ok('Created'), ...common } },
      get: { tags: ['Memories'], summary: 'List memories of a family', security: secured, parameters: [
        { name: 'family', in: 'query', required: true, schema: s },
        { name: 'category', in: 'query', schema: s }, { name: 'author', in: 'query', schema: s },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'q', in: 'query', description: 'Search title and content', schema: s },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'event'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', description: 'Max 50', schema: { type: 'integer', default: 10 } },
      ], responses: { 200: ok('Paginated list'), ...common } },
    },
    '/api/memories/{id}': {
      get: { tags: ['Memories'], summary: 'Get a memory', security: secured, parameters: [idParam()], responses: { 200: ok('Memory'), ...common } },
      patch: { tags: ['Memories'], summary: 'Update (author or family owner)', security: secured, parameters: [idParam()], requestBody: json({ title: s, content: s, category: s, eventDate: s, location: s, mediaUrl: s, people: { type: 'array', items: s } }), responses: { 200: ok('Updated'), ...common } },
      delete: { tags: ['Memories'], summary: 'Delete (author or family owner)', security: secured, parameters: [idParam()], responses: { 200: ok('Deleted'), ...common } },
    },
  },
};

// Cross-platform production entry: sets NODE_ENV before the server boots.
process.env.NODE_ENV = 'production';
await import('./index.js');


const config_redis_url = 'redis://redis:6379';
const connection = {
  host: config_redis_url.replace('redis://', '').split(':')[0] || 'localhost',
  port: parseInt(config_redis_url.split(':')[2] || '6379', 10),
};

console.log('config_redis_url:', config_redis_url);
console.log('splitted:', config_redis_url.split(':'));
console.log('host:', connection.host);
console.log('port:', connection.port);
